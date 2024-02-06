import {TriggerContext} from "@devvit/public-api";

export async function getSubredditName (context: TriggerContext) {
    // Prevent needless calls to Reddit API by using a read-through cache.
    const redisKey = "subredditName";
    const subredditName = await context.redis.get(redisKey);
    if (subredditName) {
        return subredditName;
    }

    const subreddit = await context.reddit.getCurrentSubreddit();
    await context.redis.set(redisKey, subreddit.name);
    return subreddit.name;
}

export function domainFromUrlString (url: string): string {
    const hostname = new URL(url).hostname;
    if (hostname.startsWith("www.")) {
        return hostname.substring(4);
    }
    return hostname;
}
