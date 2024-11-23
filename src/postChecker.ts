import { JSONObject, Post, ScheduledJobEvent, TriggerContext } from "@devvit/public-api";
import { incrementSourceUseCount } from "./redisHelper.js";
import { AppSetting } from "./settings.js";
import { addSeconds, addWeeks } from "date-fns";
import { domainFromUrlString } from "./utility.js";
import pluralize from "pluralize";
import { uniq } from "lodash";

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

    const settings = await context.settings.getAll();
    const sourceThreshold = settings[AppSetting.SourceThreshold] as number | undefined;

    if (!sourceThreshold) {
        console.log("Config: Threshold has not been set!");
        return;
    }

    const currentUseCount = await incrementSourceUseCount(post, context, 1);

    console.log(`${post.id}: We have seen ${domain} ${currentUseCount} ${pluralize("time", currentUseCount)} now. Threshold is ${sourceThreshold}.`);

    if (currentUseCount > sourceThreshold) {
        return;
    }

    const userLimit = settings[AppSetting.UserLimit] as number | undefined;
    if (userLimit) {
        const distinctAuthors = await distinctUsersForDomain(domain);
        console.log(`${post.id}: Domain has been submitted from ${distinctAuthors} recently.`);
        if (distinctAuthors > userLimit) {
            console.log(`${post.id}: Too many users have submitted to report.`);
            return;
        }
    }

    let reportTemplate = settings[AppSetting.ReportTemplate] as string | undefined;
    if (reportTemplate) {
        reportTemplate = reportTemplate.replace("{{domain}}", domain);
        reportTemplate = reportTemplate.replace("{{usecount}}", currentUseCount.toString());
        await context.reddit.report(post, { reason: reportTemplate });
        console.log(`${post.id}: Reported post.`);
    }
}

/**
 * A very simple interface that represents the bare minimum of data I need to satisfy the next function.
 */
interface PostAuthors {
    data: {
        children: [
            {
                data: {
                    author: string;
                };
            },
        ];
    };
}

export async function distinctUsersForDomain (domain: string): Promise<number> {
    const result = await fetch(`https://reddit.com/domain/${domain}.json?limit=100`, { method: "GET" });
    const resultBody = await result.json() as string;
    const postAuthors = JSON.parse(resultBody) as PostAuthors;
    const distinctAuthors = uniq(postAuthors.data.children.map(post => post.data.author));
    console.log(`Domain ${domain} has been submitted by ${distinctAuthors.length} distinct ${pluralize("user", distinctAuthors.length)}`);

    return distinctAuthors.length;
}
