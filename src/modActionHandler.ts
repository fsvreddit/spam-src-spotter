import {TriggerContext} from "@devvit/public-api";
import {ModAction} from "@devvit/protos";
import {isPostFiltered, removePostFilterRecord} from "./redisHelper.js";
import {queuePostCheck} from "./postChecker.js";
import {decrementUseCountIfPostWasPreviouslyChecked} from "./postRemovalHandlers.js";
import {AppSetting} from "./settings.js";

/**
 * Handles ModAction events and runs checks which will only run once per post.
 */
export async function onModAction (event: ModAction, context: TriggerContext) {
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

        const checkAfterApprove = await context.settings.get<boolean>(AppSetting.CheckAfterApproval) ?? true;

        // Check post if not an image/video post or a crosspost.
        if (checkAfterApprove && !event.targetPost.url.includes("redd.it") && !event.targetPost.url.includes("reddit.com")) {
            await queuePostCheck(event.targetPost.id, context);
        }
    }

    if ((event.action === "removelink" || event.action === "spamlink") && (event.moderator.name !== "AutoModerator" && event.moderator.name !== "reddit")) {
        console.log(`${event.targetPost.id}: Detected a ${event.action} action by ${event.moderator.name}. Checking if use count needs to be decremented.`);
        await decrementUseCountIfPostWasPreviouslyChecked(event.targetPost.id, context);
    }
}
