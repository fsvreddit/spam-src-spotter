import { reddit } from "@devvit/web/server";
import { OnPostCreateRequest, T3, TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { addPostFilterRecord } from "../core";
import { queuePostCheck } from "../core/postChecker.js";

/**
 * Trigger handler for PostCreate events. If a post is filtered by Reddit/Automod, add to Redis to allow
 * later surfacing. Otherwise if the post is visible, run checks.
 */
export const onPostCreate = async (c: Context): Promise<Response> => {
    const event = await c.req.json<OnPostCreateRequest>();

    if (!event.post) {
        return c.json<TriggerResponse>({ message: "No post found." }, 200);
    }

    // Ignore self posts, video posts, crossposts, image posts etc.
    if (event.post.isSelf || event.post.isGallery || event.post.isVideo
        || event.post.url.includes("redd.it") || event.post.url.includes("reddit.com")) {
        console.log(`${event.post.id}: Post isn't a link post.`);
        return c.json<TriggerResponse>({ message: "Post isn't a link post." }, 200);
    }

    const post = await reddit.getPostById(event.post.id as T3);

    // Check if post has been removed by a mod or automod.
    // Human mod removals will always have post.removed === true.
    // Automod removals (not filterings) have removed === false but removedByCategory === moderator. Weird!
    if (post.spam || post.removed || post.removedByCategory === "moderator") {
        console.log(`${post.id}: Post has been removed by a moderator or Automod.`);
        return c.json<TriggerResponse>({ message: "Post has been removed by a moderator or Automod." }, 200);
    }

    // Has the post been filtered by Automod or Reddit (e.g. crowd control or ban evasion)?
    const postIsFiltered = post.removedByCategory === "reddit" || post.removedByCategory === "automod_filtered";
    if (postIsFiltered) {
        console.log(`${post.id}: Post appears to be filtered. Adding to filtered post store.`);
        // Add the post to the filtered post store, so that we can act on it if it is subsequently approved.
        await addPostFilterRecord(post.id);
        return c.json<TriggerResponse>({ message: "Post appears to be filtered. Added to filtered post store." }, 200);
    }

    // If we've got to this point, the post should be visible on the subreddit!
    await queuePostCheck(post.id);
    return c.json<TriggerResponse>({ message: "Post is visible and queued for checks." }, 200);
};
