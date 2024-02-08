import {OnTriggerEvent, TriggerContext} from "@devvit/public-api";
import {ModAction} from "@devvit/protos";
import {isPostFiltered, removePostFilterRecord} from "./redisHelper.js";
import {queuePostCheck} from "./postChecker.js";
import {decrementUseCountIfPostWasPreviouslyChecked} from "./postRemovalHandlers.js";

export async function onModAction (event: OnTriggerEvent<ModAction>, context: TriggerContext) {
    if (!event.action || !event.targetPost || !event.moderator) {
        return;
    }

    if (event.action === "approvelink") {
        console.log(`${event.targetPost.id}: Detected an ApproveLink mod action by ${event.moderator.name}.`);
        const wasPostFiltered = await isPostFiltered(event.targetPost.id, context);
        if (wasPostFiltered) {
            console.log(`${event.targetPost.id}: Post was previously filtered.`);
            await removePostFilterRecord(event.targetPost.id, context);
        }

        // Check post if not an image/video post or a crosspost.
        if (!event.targetPost.url.includes("redd.it") && !event.targetPost.url.includes("reddit.com")) {
            await queuePostCheck(event.targetPost.id, context);
        }
    }

    if ((event.action === "removelink" || event.action === "spamlink") && (event.moderator.name !== "AutoModerator" && event.moderator.name !== "reddit")) {
        console.log(`${event.targetPost.id}: Detected a ${event.action} action by ${event.moderator.name}. Checking if use count needs to be decremented.`);
        await decrementUseCountIfPostWasPreviouslyChecked(event.targetPost.id, context);
    }
}
