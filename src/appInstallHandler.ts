import { JobContext, TriggerContext, ScheduledJobEvent } from "@devvit/public-api";
import { AppInstall } from "@devvit/protos";
import { domainFromUrlString } from "./utility.js";
import { SOURCE_USE_FREQUENCY } from "./redisHelper.js";
import { addDays, addHours } from "date-fns";
import { ScheduledJob } from "./constants.js";
import { hasTriggerBeenHandled } from "@fsvreddit/fsv-devvit-helpers";
import { InstallJobData } from "./types.js";

interface SourceUseFrequency {
    domain: string;
    useCount: number;
}

/**
 * Grab the hottest 1000 posts on the subreddit, store their domain usage to reduce load
 * on moderators on new installs.
 */
export async function storeInitialSourceUseCounts (event: ScheduledJobEvent<InstallJobData>, context: JobContext) {
    if (await hasTriggerBeenHandled(context.redis, `StoreInitialSourceUseCountsJob-${event.data.jobGuid}`, { expiration: addHours(new Date(), 1) })) {
        console.warn(`We've already handled this job with guid ${event.data.jobGuid}. Quitting.`);
        return;
    }

    const subredditName = context.subredditName ?? await context.reddit.getCurrentSubredditName();

    const subredditPosts = await context.reddit.getHotPosts({
        subredditName,
        limit: 1000,
        pageSize: 100,
    }).all();

    const linkPosts = subredditPosts.filter(post => !post.url.includes(post.permalink));
    const useFrequency: SourceUseFrequency[] = [];

    for (const post of linkPosts) {
        const currentDomain = domainFromUrlString(post.url);
        const currentUseFrequency = useFrequency.find(x => x.domain === currentDomain);
        if (currentUseFrequency) {
            currentUseFrequency.useCount++;
        } else {
            useFrequency.push({ domain: currentDomain, useCount: 1 });
        }
    }

    await context.redis.zAdd(SOURCE_USE_FREQUENCY, ...useFrequency.map(x => ({ member: x.domain, score: x.useCount })));

    // Store a record of posts that were used to seed the data, in case they get reported.
    for (const post of linkPosts) {
        const redisKey = `PreviousPostCheck-${post.id}`;

        await context.redis.set(redisKey, post.createdAt.getTime().toString(), { expiration: addDays(post.createdAt, 7) });
    }
}

/**
 * Runs on app install, and seeds the source use store with data from the hottest 1000 link posts to
 * reduce workload on moderators. Also sets up scheduled jobs.
 */
export async function onAppInstall (_: AppInstall, context: TriggerContext) {
    await context.scheduler.runJob({
        name: ScheduledJob.StoreInitialSourceUseCounts,
        runAt: new Date(),
        data: { jobGuid: crypto.randomUUID() } satisfies InstallJobData,
    });
}
