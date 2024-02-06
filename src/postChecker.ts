import {Post, TriggerContext} from "@devvit/public-api";
import {incrementSourceUseCount} from "./redisHelper.js";
import {AppSetting} from "./settings.js";
import {addWeeks} from "date-fns";
import {domainFromUrlString} from "./utility.js";

export async function checkAndActionPost (post: Post, context: TriggerContext) {
    const domain = domainFromUrlString(post.url);
    console.log(`Checking post ${post.id} with domain ${domain}`);

    const previousCheckKey = `PreviousPostCheck-${post.id}`;

    const previouslyChecked = await context.redis.get(previousCheckKey);
    if (previouslyChecked) {
        console.log("We have previously checked this post. Quitting.");
        return;
    }

    // Add a Redis key to prevent re-processing. Persist records for one week only to manage growth.
    await context.redis.set(previousCheckKey, new Date().getTime().toString(), {expiration: addWeeks(new Date(), 1)});

    const sourceThreshold = await context.settings.get<number>(AppSetting.SourceThreshold);

    if (!sourceThreshold) {
        console.log("Threshold has not been set!");
        return;
    }

    const currentUseCount = await incrementSourceUseCount(post, context, 1);

    console.log(`We have seen this domain ${currentUseCount} times now (min threshold to allow through is ${sourceThreshold})`);

    if (currentUseCount >= sourceThreshold) {
        return;
    }

    let reportTemplate = await context.settings.get<string>(AppSetting.ReportTemplate);
    if (reportTemplate) {
        reportTemplate = reportTemplate.replace("{{domain}}", domain);
        reportTemplate = reportTemplate.replace("{{usecount}}", currentUseCount.toString());
        await context.reddit.report(post, {reason: reportTemplate});
    }
}
