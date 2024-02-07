import {OnTriggerEvent, TriggerContext} from "@devvit/public-api";
import {PostDelete} from "@devvit/protos";
import {currentSourceUseCount, incrementSourceUseCount, removePostFilterRecord} from "./redisHelper.js";

export async function onPostDelete (event: OnTriggerEvent<PostDelete>, context: TriggerContext) {
    if (event.source !== 1) {
        // If post was not deleted by the user, we don't want to decrement.
        return;
    }
    console.log(`${event.postId}: User deleted their post.`);
    await decrementUseCountIfPostWasPreviouslyChecked(event.postId, context);
    await removePostFilterRecord(event.postId, context);
}

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
        console.log(`${postId}: Current usage for this domain is ${score}. Decrementing`);
        await incrementSourceUseCount(post, context, -1);
    }
}
