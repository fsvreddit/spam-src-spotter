import { Devvit } from "@devvit/public-api";
import { appSettings } from "./settings.js";
import { onAppInstall, storeInitialSourceUseCounts } from "./appInstallHandler.js";
import { onPostCreate } from "./postCreateHandler.js";
import { onModAction } from "./modActionHandler.js";
import { onPostDelete } from "./postRemovalHandlers.js";
import { runCheckOnPost } from "./postChecker.js";
import { ScheduledJob } from "./constants.js";

Devvit.addSettings(appSettings);

Devvit.addTrigger({
    event: "AppInstall",
    onEvent: onAppInstall,
});

Devvit.addTrigger({
    event: "PostCreate",
    onEvent: onPostCreate,
});

Devvit.addTrigger({
    event: "ModAction",
    onEvent: onModAction,
});

Devvit.addTrigger({
    event: "PostDelete",
    onEvent: onPostDelete,
});

Devvit.addSchedulerJob({
    name: ScheduledJob.RunCheckOnPosts,
    onRun: runCheckOnPost,
});

Devvit.addSchedulerJob({
    name: ScheduledJob.StoreInitialSourceUseCounts,
    onRun: storeInitialSourceUseCounts,
});

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
