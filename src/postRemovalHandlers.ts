import {OnTriggerEvent, TriggerContext} from "@devvit/public-api";
import {PostDelete} from "@devvit/protos";
import {currentSourceUseCount, incrementSourceUseCount, isPostInFilteredPostStore} from "./redisHelper.js";

export async function onPostDelete (event: OnTriggerEvent<PostDelete>, context: TriggerContext) {
    await decrementUseCountIfPostWasFiltered(event.postId, context);
}

export async function decrementUseCountIfPostWasFiltered (postId: string, context: TriggerContext) {
    const wasPostFiltered = await isPostInFilteredPostStore(postId, context);
    if (wasPostFiltered) {
        const post = await context.reddit.getPostById(postId);
        const score = await currentSourceUseCount(post, context);

        if (score > 0) {
            await incrementSourceUseCount(post, context, -1);
        }
    }
}
