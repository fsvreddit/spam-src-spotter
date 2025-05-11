import { Devvit } from "@devvit/public-api";
import { appSettings } from "./settings.js";
import { onAppInstall, storeInitialSourceUseCounts } from "./appInstallHandler.js";
import { onPostCreate } from "./postCreateHandler.js";
import { onModAction } from "./modActionHandler.js";
import { onPostDelete } from "./postRemovalHandlers.js";
import { runCheckOnPost } from "./postChecker.js";
import { RUN_CHECK_ON_POSTS_JOB, STORE_INITIAL_SOURCE_USE_COUNTS } from "./constants.js";

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
    name: RUN_CHECK_ON_POSTS_JOB,
    onRun: runCheckOnPost,
});

Devvit.addSchedulerJob({
    name: STORE_INITIAL_SOURCE_USE_COUNTS,
    onRun: storeInitialSourceUseCounts,
});

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
