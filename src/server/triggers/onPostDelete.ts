import { reddit, redis } from "@devvit/web/server";
import { OnPostDeleteRequest, T3, TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { currentSourceUseCount, incrementSourceUseCount, removePostFilterRecord } from "../core";
import { domainFromUrlString } from "../core/utility.js";
import { hasEventBeenHandled } from "@fsvreddit/fsv-devvit-web-helpers";

/**
 * Handles PostDelete events. If the user deleted their own post, decreases the domain's use count
 * (if previously was checked), and removes record of post being filtered if post was still in modqueue.
 */
export const onPostDelete = async (c: Context): Promise<Response> => {
    const event = await c.req.json<OnPostDeleteRequest>();

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    if (event.source as number !== 1) {
        // If post was not deleted by the user, we don't want to decrement.
        return c.json<TriggerResponse>({ success: true }, 200);
    }

    if (await hasEventBeenHandled(`PostDelete-${event.postId}`)) {
        console.log(`${event.postId}: We've already handled a delete event for this post. Quitting.`);
        return c.json<TriggerResponse>({ success: true }, 200);
    }

    console.log(`${event.postId}: User deleted their post.`);
    await decrementUseCountIfPostWasPreviouslyChecked(event.postId as T3);
    await removePostFilterRecord(event.postId);
    return c.json<TriggerResponse>({ success: true }, 200);
};

/**
 * Checks to see if a post has previously been checked (i.e. had been visible on the subreddit) and
 * decrements the use count for the domain if so.
 */
export async function decrementUseCountIfPostWasPreviouslyChecked (postId: T3) {
    const previousCheckKey = `PreviousPostCheck-${postId}`;
    const previouslyChecked = await redis.get(previousCheckKey);
    if (!previouslyChecked) {
        console.log(`${postId}: We have not previously checked this post, so no need to decrement.`);
        return;
    }
    await redis.del(previousCheckKey);

    console.log(`${postId}: Post has been previously checked. Checking if score needs to be decremented.`);

    const post = await reddit.getPostById(postId);
    const score = await currentSourceUseCount(post);

    if (score > 0) {
        console.log(`${postId}: Current usage for ${domainFromUrlString(post.url)} is ${score}. Decrementing`);
        await incrementSourceUseCount(post, -1);
    }
}
