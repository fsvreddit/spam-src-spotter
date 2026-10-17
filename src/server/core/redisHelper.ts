import { redis } from "@devvit/web/server";
import { domainFromUrlString } from ".";
import { addDays } from "date-fns";
import { Post } from "@devvit/web/server";

export const SOURCE_USE_FREQUENCY = "SourceUseFrequency";

function getFilterRecordRedisKey (postId: string): string {
    return `FilteredPost-${postId}`;
}

export async function isPostFiltered (postId: string): Promise<boolean> {
    const redisKey = getFilterRecordRedisKey(postId);
    const result = await redis.get(redisKey);
    return result !== undefined && result !== "";
}

export async function addPostFilterRecord (postId: string) {
    const redisKey = getFilterRecordRedisKey(postId);
    await redis.set(redisKey, new Date().getTime().toString(), { expiration: addDays(new Date(), 7) });
}

export async function removePostFilterRecord (postId: string) {
    const redisKey = getFilterRecordRedisKey(postId);
    await redis.del(redisKey);
}

export async function currentSourceUseCount (post: Post): Promise<number> {
    let score: number;
    try {
        const domain = domainFromUrlString(post.url);
        score = await redis.zScore(SOURCE_USE_FREQUENCY, domain) ?? 0;
        return score;
    } catch {
        return 0;
    }
}

export async function incrementSourceUseCount (post: Post, incrementBy: number): Promise<number> {
    const domain = domainFromUrlString(post.url);
    const newScore = await redis.zIncrBy(SOURCE_USE_FREQUENCY, domain, incrementBy);
    return newScore;
}
