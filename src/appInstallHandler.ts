import {TriggerContext, ZMember} from "@devvit/public-api";
import {AppInstall} from "@devvit/protos";
import {domainFromUrlString} from "./utility.js";
import {SOURCE_USE_FREQUENCY} from "./redisHelper.js";
import {addDays} from "date-fns";
import _ from "lodash";

/**
 * Grab the hottest 1000 posts on the subreddit, store their domain usage to reduce load
 * on moderators on new installs.
 */
export async function storeInitialSourceUseCounts (context: TriggerContext) {
    const subreddit = await context.reddit.getCurrentSubreddit();

    const subredditPosts = await context.reddit.getHotPosts({
        subredditName: subreddit.name,
        limit: 1000,
        pageSize: 100,
    }).all();

    const linkPosts = subredditPosts.filter(post => !post.url.includes(post.permalink));

    const countedDomains = _.countBy(linkPosts.map(post => domainFromUrlString(post.url)));
    const useFrequency = Object.entries(countedDomains).map(([domain, count]) => ({member: domain, score: count} as ZMember));

    await context.redis.zAdd(SOURCE_USE_FREQUENCY, ...useFrequency);

    // Store a record of posts that were used to seed the data, in case they get reported.
    for (const post of linkPosts) {
        const redisKey = `PreviousPostCheck-${post.id}`;
        await context.redis.set(redisKey, post.createdAt.getTime().toString(), {expiration: addDays(post.createdAt, 7)});
    }
}

/**
 * Runs on app install, and seeds the source use store with data from the hottest 1000 link posts to
 * reduce workload on moderators. Also sets up scheduled jobs.
 */
export async function onAppInstall (_: AppInstall, context: TriggerContext) {
    await storeInitialSourceUseCounts(context);
}
