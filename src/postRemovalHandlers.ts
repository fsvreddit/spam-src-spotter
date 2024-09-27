import {TriggerContext} from "@devvit/public-api";
import {PostDelete} from "@devvit/protos";
import {currentSourceUseCount, incrementSourceUseCount, removePostFilterRecord} from "./redisHelper.js";
import {domainFromUrlString} from "./utility.js";

/**
 * Handles PostDelete events. If the user deleted their own post, decreases the domain's use count
 * (if previously was checked), and removes record of post being filtered if post was still in modqueue.
 */
export async function onPostDelete (event: PostDelete, context: TriggerContext) {
    if (event.source !== 1) {
        // If post was not deleted by the user, we don't want to decrement.
        return;
    }
    console.log(`${event.postId}: User deleted their post.`);
    await decrementUseCountIfPostWasPreviouslyChecked(event.postId, context);
    await removePostFilterRecord(event.postId, context);
}

/**
 * Checks to see if a post has previously been checked (i.e. had been visible on the subreddit) and
 * decrements the use count for the domain if so.
 */
export async function decrementUseCountIfPostWasPreviouslyChecked (postId: string, context: TriggerContext) {
    const previousCheckKey = `PreviousPostCheck-${postId}`;
    const previouslyChecked = await context.redis.get(previousCheckKey);
    if (!previouslyChecked) {
        console.log(`${postId}: We have not previously checked this post, so no need to decrement.`);
        return;
    }
    await context.redis.del(previousCheckKey);

    console.log(`${postId}: Post has been previously checked. Checking if score needs to be decremented.`);

    const post = await context.reddit.getPostById(postId);
    const score = await currentSourceUseCount(post, context);

    if (score > 0) {
        console.log(`${postId}: Current usage for ${domainFromUrlString(post.url)} is ${score}. Decrementing`);
        await incrementSourceUseCount(post, context, -1);
    }
}
