import { settings } from "@devvit/web/server";
import { OnModActionRequest, T3, TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { isPostFiltered, removePostFilterRecord } from "../core";
import { queuePostCheck } from "../core/postChecker.js";
import { decrementUseCountIfPostWasPreviouslyChecked } from "./onPostDelete.js";
import { AppSetting } from "../core";
import { hasEventBeenHandled } from "@fsvreddit/fsv-devvit-web-helpers";
import { addMinutes } from "date-fns";

async function hasModActionBeenHandled (event: OnModActionRequest): Promise<boolean> {
    return await hasEventBeenHandled(`ModAction:${event.moderator?.name}:${event.action}:${event.targetPost?.id}:${event.actionedAt}`, { expiration: addMinutes(new Date(), 10) });
}

/**
 * Handles ModAction events and runs checks which will only run once per post.
 */
export const onModAction = async (c: Context): Promise<Response> => {
    const event = await c.req.json<OnModActionRequest>();

    if (!event.action || !event.targetPost || !event.moderator) {
        return c.json<TriggerResponse>({ success: true }, 200);
    }

    if (event.action === "approvelink") {
        if (await hasModActionBeenHandled(event)) {
            console.log(`${event.targetPost.id}: We've already handled this approve action. Quitting.`);
            return c.json<TriggerResponse>({ success: true }, 200);
        }

        console.log(`${event.targetPost.id}: Detected an ApproveLink mod action by ${event.moderator.name}.`);
        const wasPostFiltered = await isPostFiltered(event.targetPost.id);
        if (wasPostFiltered) {
            console.log(`${event.targetPost.id}: Post was previously filtered.`);
            await removePostFilterRecord(event.targetPost.id);
        }

        const checkAfterApprove = await settings.get<boolean>(AppSetting.CheckAfterApproval) ?? true;

        // Check post if not an image/video post or a crosspost.
        if (checkAfterApprove && !event.targetPost.url.includes("redd.it") && !event.targetPost.url.includes("reddit.com")) {
            await queuePostCheck(event.targetPost.id);
        }
    }

    if ((event.action === "removelink" || event.action === "spamlink") && (event.moderator.name !== "AutoModerator" && event.moderator.name !== "reddit")) {
        if (await hasModActionBeenHandled(event)) {
            console.log(`${event.targetPost.id}: We've already handled this remove/spam action. Quitting.`);
            return c.json<TriggerResponse>({ success: true }, 200);
        }

        console.log(`${event.targetPost.id}: Detected a ${event.action} action by ${event.moderator.name}. Checking if use count needs to be decremented.`);
        await decrementUseCountIfPostWasPreviouslyChecked(event.targetPost.id as T3);
    }

    return c.json<TriggerResponse>({ success: true }, 200);
};
