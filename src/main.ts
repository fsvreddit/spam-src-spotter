import {Devvit} from "@devvit/public-api";
import {appSettings} from "./settings.js";
import {onAppInstall, onAppUpgrade} from "./appInstallHandler.js";
import {onPostCreate} from "./postCreateHandler.js";
import {onModAction} from "./modActionHandler.js";
import {onPostDelete} from "./postRemovalHandlers.js";
import {cleanupFilteredPostStore} from "./redisHelper.js";

Devvit.addSettings(appSettings);

Devvit.addTrigger({
    events: ["AppInstall"],
    onEvent: onAppInstall,
});

Devvit.addTrigger({
    events: ["AppUpgrade"],
    onEvent: onAppUpgrade,
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
    events: ["PostDelete"],
    onEvent: onPostDelete,
});

Devvit.addSchedulerJob({
    name: "cleanupFilteredPostStore",
    onRun: cleanupFilteredPostStore,
});

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
