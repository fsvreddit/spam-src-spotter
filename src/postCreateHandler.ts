import {OnTriggerEvent, TriggerContext} from "@devvit/public-api";
import {PostCreate} from "@devvit/protos";
import {addPostToFilteredPostStore} from "./redisHelper.js";
import {checkAndActionPost} from "./postChecker.js";

export async function onPostCreate (event: OnTriggerEvent<PostCreate>, context: TriggerContext) {
    if (!event.post || event.post.isSelf || event.post.isGallery || event.post.isVideo) {
        return;
    }

    const post = await context.reddit.getPostById(event.post.id);

    // Check if post has been removed by a mod or automod.
    // Human mod removals will always have post.removed === true.
    // Automod removals (not filterings) have removed === false but removedByCategory === moderator. Weird!
    if (post.removed || post.removedByCategory === "moderator") {
        return;
    }

    // Has the post been filtered by Automod or Reddit (e.g. crowd control or ban evasion)?
    const postIsFiltered = post.removedByCategory === "reddit" || post.removedByCategory === "automod_filtered";
    if (postIsFiltered) {
        console.log("Found a post that appears to be filtered. Adding to filtered post store.");
        // Add the post to the filtered post store, so that we can act on it if it is subsequently approved.
        await addPostToFilteredPostStore(post, context);
        return;
    }

    // If we've got to this point, the post should be visible on the subreddit!
    await checkAndActionPost(post, context);
}
