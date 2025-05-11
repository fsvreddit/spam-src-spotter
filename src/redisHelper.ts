import { Post, TriggerContext } from "@devvit/public-api";
import { domainFromUrlString } from "./utility.js";
import { addDays } from "date-fns";

export const SOURCE_USE_FREQUENCY = "SourceUseFrequency";

function getFilterRecordRedisKey (postId: string): string {
    return `FilteredPost-${postId}`;
}

export async function isPostFiltered (postId: string, context: TriggerContext): Promise<boolean> {
    const redisKey = getFilterRecordRedisKey(postId);
    const result = await context.redis.get(redisKey);
    return result !== undefined && result !== "";
}

export async function addPostFilterRecord (postId: string, context: TriggerContext) {
    const redisKey = getFilterRecordRedisKey(postId);
    await context.redis.set(redisKey, new Date().getTime().toString(), { expiration: addDays(new Date(), 7) });
}

export async function removePostFilterRecord (postId: string, context: TriggerContext) {
    const redisKey = getFilterRecordRedisKey(postId);
    await context.redis.del(redisKey);
}

export async function currentSourceUseCount (post: Post, context: TriggerContext): Promise<number> {
    let score: number;
    try {
        const domain = domainFromUrlString(post.url);
        score = await context.redis.zScore(SOURCE_USE_FREQUENCY, domain) ?? 0;
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
