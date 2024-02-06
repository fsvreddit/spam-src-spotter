import {OnTriggerEvent, TriggerContext} from "@devvit/public-api";
import {AppInstall, AppUpgrade} from "@devvit/protos";
import {domainFromUrlString, getSubredditName} from "./utility.js";
import {SOURCE_USE_FREQUENCY} from "./redisHelper.js";

/**
 * Clears down and reschedules any jobs used by this application.
 */
async function scheduleJobs (context: TriggerContext) {
    const currentJobs = await context.scheduler.listJobs();
    await Promise.all(currentJobs.map(job => context.scheduler.cancelJob(job.id)));

    // Randomise exact run time per install. It doesn't matter when this runs as long as it runs sometimes.
    const minuteToRun = Math.floor(Math.random() * 60);
    const hourToRun = Math.floor(Math.random() * 24);
    const cron = `${minuteToRun} ${hourToRun} * * *`;

    console.log(`Rescheduling job. New cron: ${cron}`);

    await context.scheduler.runJob({
        name: "cleanupFilteredPostStore",
        cron,
    });
}

interface SourceUseFrequency {
    domain: string,
    useCount: number,
}

/**
 * Runs on app install, and seeds the source use store with data from the hottest 1000 link posts to
 * reduce workload on moderators. Also sets up scheduled jobs.
 */
export async function onAppInstall (event: OnTriggerEvent<AppInstall>, context: TriggerContext) {
    const subredditName = await getSubredditName(context);

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
            useFrequency.push({domain: currentDomain, useCount: 1});
        }
    }

    await context.redis.zAdd(SOURCE_USE_FREQUENCY, ...useFrequency.map(x => ({member: x.domain, score: x.useCount})));

    await scheduleJobs(context);
}

/**
 * Runs on app upgrade, and reschedules jobs.
 */
export async function onAppUpgrade (event: OnTriggerEvent<AppUpgrade>, context: TriggerContext) {
    await scheduleJobs(context);
}
