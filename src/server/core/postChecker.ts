import { Post, reddit, redis, scheduler, settings, TaskRequest } from "@devvit/web/server";
import { T3 } from "@devvit/web/shared";
import { incrementSourceUseCount } from "./redisHelper.js";
import { AppSetting } from "./appSettings.js";
import { addHours, addSeconds, addWeeks } from "date-fns";
import { domainFromUrlString } from "./utility.js";
import { SchedulerJob } from "./constants.js";
import { hasEventBeenHandled } from "@fsvreddit/fsv-devvit-web-helpers";
import { PostCheckJobData } from "../tasks";

/**
 * Runs checks on a 15 second delay to allow for async operations to complete.
 */
export async function queuePostCheck (postId: string) {
    if (await hasEventBeenHandled(`PostCheck-${postId}`)) {
        console.log(`${postId}: We've already queued a check for this post. Quitting.`);
        return;
    }

    console.log(`${postId}: Queueing check on post for 15 seconds.`);
    await scheduler.runJob<PostCheckJobData>({
        name: SchedulerJob.RunCheckOnPosts,
        data: { postId, jobGuid: crypto.randomUUID() } satisfies PostCheckJobData,
        runAt: addSeconds(new Date(), 15),
    });
}

/**
 * Scheduled Job execution handler. Gets the post and passes through to the checking function.
 */
export async function runCheckOnPost (event: TaskRequest<PostCheckJobData>) {
    if (await hasEventBeenHandled(`PostCheckJob-${event.data.jobGuid}`, { expiration: addHours(new Date(), 1) })) {
        console.warn(`${event.data.postId}: Already handled a job with guid ${event.data.jobGuid}. Quitting.`);
        return;
    }

    const post = await reddit.getPostById(event.data.postId as T3);
    await checkAndActionPost(post);
}

async function getRecentDistinctUsersForSource (domain: string): Promise<number> {
    const cacheKey = `RecentDistinctUsers-${domain}`;
    const cachedCountValue = await redis.get(cacheKey);
    if (cachedCountValue) {
        return parseInt(cachedCountValue, 10);
    }

    const recentPosts = await reddit.searchPosts({
        query: `site:${domain}`,
        sort: "new",
        timeframe: "month",
        pageSize: 1000,
    }).all();

    const distinctUserCount = new Set(recentPosts.map(post => post.authorId).filter(authorId => authorId !== undefined)).size;
    await redis.set(cacheKey, distinctUserCount.toString(), { expiration: addHours(new Date(), 1) });
    return distinctUserCount;
}

/**
 * Checks a post and reports if the source hasn't been seen enough times.
 */
export async function checkAndActionPost (post: Post) {
    if (post.removed || post.removedByCategory) {
        console.log(`${post.id}: Post has been deleted or removed after checks queued. RemovedByCategory: ${post.removedByCategory ?? "undefined"}`);
        return;
    }

    const domain = domainFromUrlString(post.url);
    console.log(`${post.id}: Checking post with domain ${domain}`);

    const previousCheckKey = `PreviousPostCheck-${post.id}`;

    // Add a Redis key to prevent re-processing. Persist records for one week only to manage growth.
    await redis.set(previousCheckKey, new Date().getTime().toString(), { expiration: addWeeks(new Date(), 1) });

    const appSettings = await settings.getAll();

    const sourceThreshold = appSettings[AppSetting.SourceThreshold] as number | undefined;
    const userCountThreshold = appSettings[AppSetting.UserCountThreshold] as number | undefined;

    if (!sourceThreshold) {
        console.log("Config: Threshold has not been set!");
        return;
    }

    const currentUseCount = await incrementSourceUseCount(post, 1);

    console.log(`${post.id}: We have seen ${domain} ${currentUseCount} time(s) now. Threshold is ${sourceThreshold}.`);

    if (currentUseCount > sourceThreshold) {
        return;
    }

    if (userCountThreshold) {
        const recentDistinctUsers = await getRecentDistinctUsersForSource(domain);
        console.log(`${post.id}: We have seen ${domain} from ${recentDistinctUsers} distinct user(s) in the last month. Threshold is ${userCountThreshold}.`);

        if (recentDistinctUsers > userCountThreshold) {
            return;
        }
    }

    let reportTemplate = appSettings[AppSetting.ReportTemplate] as string | undefined;
    if (reportTemplate) {
        reportTemplate = reportTemplate.replace("{{domain}}", domain);
        reportTemplate = reportTemplate.replace("{{usecount}}", currentUseCount.toString());
        await reddit.report(post, { reason: reportTemplate });
    }
}
