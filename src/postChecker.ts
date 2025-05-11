import { JSONObject, Post, ScheduledJobEvent, TriggerContext } from "@devvit/public-api";
import { incrementSourceUseCount } from "./redisHelper.js";
import { AppSetting } from "./settings.js";
import { addSeconds, addWeeks } from "date-fns";
import { domainFromUrlString } from "./utility.js";

/**
 * Runs checks on a 15 second delay to allow for async operations to complete.
 */
export async function queuePostCheck (postId: string, context: TriggerContext) {
    const previousCheckKey = `PreviousPostCheck-${postId}`;

    const previouslyChecked = await context.redis.get(previousCheckKey);
    if (previouslyChecked) {
        console.log(`${postId}: We have previously checked this post. Quitting.`);
        return;
    }

    console.log(`${postId}: Queueing check on post for 15 seconds.`);
    await context.scheduler.runJob({
        name: "runCheckOnPost",
        data: { postId },
        runAt: addSeconds(new Date(), 15),
    });
}

/**
 * Scheduled Job execution handler. Gets the post and passes through to the checking function.
 */
export async function runCheckOnPost (event: ScheduledJobEvent<JSONObject | undefined>, context: TriggerContext) {
    if (!event.data) {
        console.log("Scheduler job's data not assigned");
        return;
    }

    const postId = event.data.postId as string;
    const post = await context.reddit.getPostById(postId);
    await checkAndActionPost(post, context);
}

/**
 * Checks a post and reports if the source hasn't been seen enough times.
 */
export async function checkAndActionPost (post: Post, context: TriggerContext) {
    if (post.removed || post.removedByCategory) {
        console.log(`${post.id}: Post has been deleted or removed after checks queued. RemovedByCategory: ${post.removedByCategory ?? "undefined"}`);
        return;
    }

    const domain = domainFromUrlString(post.url);
    console.log(`${post.id}: Checking post with domain ${domain}`);

    const previousCheckKey = `PreviousPostCheck-${post.id}`;

    // Add a Redis key to prevent re-processing. Persist records for one week only to manage growth.
    await context.redis.set(previousCheckKey, new Date().getTime().toString(), { expiration: addWeeks(new Date(), 1) });

    const sourceThreshold = await context.settings.get<number>(AppSetting.SourceThreshold);

    if (!sourceThreshold) {
        console.log("Config: Threshold has not been set!");
        return;
    }

    const currentUseCount = await incrementSourceUseCount(post, context, 1);

    console.log(`${post.id}: We have seen ${domain} ${currentUseCount} time(s) now. Threshold is ${sourceThreshold}.`);

    if (currentUseCount > sourceThreshold) {
        return;
    }

    let reportTemplate = await context.settings.get<string>(AppSetting.ReportTemplate);
    if (reportTemplate) {
        reportTemplate = reportTemplate.replace("{{domain}}", domain);
        reportTemplate = reportTemplate.replace("{{usecount}}", currentUseCount.toString());
        await context.reddit.report(post, { reason: reportTemplate });
    }
}
