import {OnTriggerEvent, TriggerContext} from "@devvit/public-api";
import {ModAction} from "@devvit/protos";
import {isPostInFilteredPostStore} from "./redisHelper.js";
import {checkAndActionPost} from "./postChecker.js";
import {decrementUseCountIfPostWasFiltered} from "./postRemovalHandlers.js";

export async function onModAction (event: OnTriggerEvent<ModAction>, context: TriggerContext) {
    if (!event.action || !event.targetPost) {
        return;
    }

    if (event.action === "approvelink") {
        const wasPostFiltered = await isPostInFilteredPostStore(event.targetPost.id, context);
        if (wasPostFiltered) {
            console.log("Detected an ApproveLink mod action. Post was previously filtered, so running checks.");
            const post = await context.reddit.getPostById(event.targetPost.id);
            await checkAndActionPost(post, context);
        }
    }

    if (event.action === "removelink" || event.action === "spamlink") {
        console.log(`Detected a ${event.action} action. Checking if use count needs to be decremented.`);
        await decrementUseCountIfPostWasFiltered(event.targetPost.id, context);
    }
}
