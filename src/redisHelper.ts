import {Post, ScheduledJobEvent, TriggerContext} from "@devvit/public-api";
import {domainFromUrlString} from "./utility.js";
import {addDays} from "date-fns";

export const FILTERED_POST_STORE = "FilteredPostStore";
export const SOURCE_USE_FREQUENCY = "SourceUseFrequency";

export async function isPostInFilteredPostStore (postId: string, context: TriggerContext): Promise<boolean> {
    let score: number | undefined;
    try {
        score = await context.redis.zScore(FILTERED_POST_STORE, postId);
    } catch {
        score = undefined;
    }
    return score !== undefined;
}

export async function addPostToFilteredPostStore (post: Post, context: TriggerContext) {
    await context.redis.zAdd(FILTERED_POST_STORE, {member: post.id, score: post.createdAt.getTime()});
}

export async function currentSourceUseCount (post: Post, context: TriggerContext): Promise<number> {
    let score: number;
    try {
        const domain = domainFromUrlString(post.url);
        score = await context.redis.zScore(SOURCE_USE_FREQUENCY, domain);
        return score;
    } catch {
        return 0;
    }
}

export async function incrementSourceUseCount (post: Post, context: TriggerContext, incrementBy: number): Promise<number> {
    const domain = domainFromUrlString(post.url);
    const newScore = await context.redis.zIncrBy(SOURCE_USE_FREQUENCY, domain, incrementBy);
    return newScore;
}

/**
 * Cleans up the filtered post store by removing entries over a week old. By that age it can be
 * reasonably assumed that those posts were removed, not filtered, on most subreddits.
 */
export async function cleanupFilteredPostStore (event: ScheduledJobEvent, context: TriggerContext) {
    await context.redis.zRemRangeByScore(FILTERED_POST_STORE, 0, addDays(new Date(), -7).getTime());
}
