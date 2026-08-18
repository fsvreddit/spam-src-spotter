import { Post, ScheduledJobEvent, TriggerContext } from "@devvit/public-api";
import { incrementSourceUseCount } from "./redisHelper.js";
import { AppSetting } from "./settings.js";
import { addHours, addSeconds, addWeeks } from "date-fns";
import { domainFromUrlString } from "./utility.js";
import { ScheduledJob } from "./constants.js";
import { hasTriggerBeenHandled } from "@fsvreddit/fsv-devvit-helpers";
import { PostCheckJobData } from "./types.js";

/**
 * Runs checks on a 15 second delay to allow for async operations to complete.
 */
export async function queuePostCheck (postId: string, context: TriggerContext) {
    if (await hasTriggerBeenHandled(context.redis, `PostCheck-${postId}`)) {
        console.log(`${postId}: We've already queued a check for this post. Quitting.`);
        return;
    }

    console.log(`${postId}: Queueing check on post for 15 seconds.`);
    await context.scheduler.runJob({
        name: ScheduledJob.RunCheckOnPosts,
        data: { postId, jobGuid: crypto.randomUUID() } satisfies PostCheckJobData,
        runAt: addSeconds(new Date(), 15),
    });
}

/**
 * Scheduled Job execution handler. Gets the post and passes through to the checking function.
 */
export async function runCheckOnPost (event: ScheduledJobEvent<PostCheckJobData>, context: TriggerContext) {
    if (await hasTriggerBeenHandled(context.redis, `PostCheckJob-${event.data.jobGuid}`, { expiration: addHours(new Date(), 1) })) {
        console.warn(`${event.data.postId}: Already handled a job with guid ${event.data.jobGuid}. Quitting.`);
        return;
    }

    const post = await context.reddit.getPostById(event.data.postId);
    await checkAndActionPost(post, context);
}

async function getRecentDistinctUsersForSource (domain: string, context: TriggerContext): Promise<number> {
    const cacheKey = `RecentDistinctUsers-${domain}`;
    const cachedCountValue = await context.redis.get(cacheKey);
    if (cachedCountValue) {
        return parseInt(cachedCountValue, 10);
    }

    const recentPosts = await context.reddit.searchPosts({
        query: `site:${domain}`,
        sort: "new",
        timeframe: "month",
        pageSize: 1000,
    }).all();

    const distinctUserCount = new Set(recentPosts.map(post => post.authorId).filter(authorId => authorId !== undefined)).size;
    await context.redis.set(cacheKey, distinctUserCount.toString(), { expiration: addHours(new Date(), 1) });
    return distinctUserCount;
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

    const settings = await context.settings.getAll();

    const sourceThreshold = settings[AppSetting.SourceThreshold] as number | undefined;
    const userCountThreshold = settings[AppSetting.UserCountThreshold] as number | undefined;

    if (!sourceThreshold) {
        console.log("Config: Threshold has not been set!");
        return;
    }

    const currentUseCount = await incrementSourceUseCount(post, context, 1);

    console.log(`${post.id}: We have seen ${domain} ${currentUseCount} time(s) now. Threshold is ${sourceThreshold}.`);

    if (currentUseCount > sourceThreshold) {
        return;
    }

    if (userCountThreshold) {
        const recentDistinctUsers = await getRecentDistinctUsersForSource(domain, context);
        console.log(`${post.id}: We have seen ${domain} from ${recentDistinctUsers} distinct user(s) in the last month. Threshold is ${userCountThreshold}.`);

        if (recentDistinctUsers > userCountThreshold) {
            return;
        }
    }

    let reportTemplate = settings[AppSetting.ReportTemplate] as string | undefined;
    if (reportTemplate) {
        reportTemplate = reportTemplate.replace("{{domain}}", domain);
        reportTemplate = reportTemplate.replace("{{usecount}}", currentUseCount.toString());
        await context.reddit.report(post, { reason: reportTemplate });
    }
}
