import {TriggerContext} from "@devvit/public-api";
import {PostCreate} from "@devvit/protos";
import {addPostFilterRecord} from "./redisHelper.js";
import {queuePostCheck} from "./postChecker.js";

/**
 * Trigger handler for PostCreate events. If a post is filtered by Reddit/Automod, add to Redis to allow
 * later surfacing. Otherwise if the post is visible, run checks.
 */
export async function onPostCreate (event: PostCreate, context: TriggerContext) {
    if (!event.post) {
        return;
    }

    // Ignore self posts, video posts, crossposts, image posts etc.
    if (event.post.isSelf || event.post.isGallery || event.post.isVideo
        || event.post.url.includes("redd.it" || event.post.url.includes("reddit.com"))) {
        console.log(`${event.post.id}: Post isn't a link post.`);
        return;
    }

    const post = await context.reddit.getPostById(event.post.id);

    // Check if post has been removed by a mod or automod.
    // Human mod removals will always have post.removed === true.
    // Automod removals (not filterings) have removed === false but removedByCategory === moderator. Weird!
    if (post.spam || post.removed || post.removedByCategory === "moderator") {
        console.log(`${post.id}: Post has been removed by a moderator or Automod.`);
        return;
    }

    // Has the post been filtered by Automod or Reddit (e.g. crowd control or ban evasion)?
    const postIsFiltered = post.removedByCategory === "reddit" || post.removedByCategory === "automod_filtered";
    if (postIsFiltered) {
        console.log(`${post.id}: Post appears to be filtered. Adding to filtered post store.`);
        // Add the post to the filtered post store, so that we can act on it if it is subsequently approved.
        await addPostFilterRecord(post.id, context);
        return;
    }

    // If we've got to this point, the post should be visible on the subreddit!
    await queuePostCheck(post.id, context);
}
