import { Devvit } from "@devvit/public-api";
import { appSettings } from "./settings.js";
import { onAppInstall } from "./appInstallHandler.js";
import { onPostCreate } from "./postCreateHandler.js";
import { onModAction } from "./modActionHandler.js";
import { onPostDelete } from "./postRemovalHandlers.js";
import { runCheckOnPost } from "./postChecker.js";

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
    name: "runCheckOnPost",
    onRun: runCheckOnPost,
});

Devvit.configure({
    redditAPI: true,
    redis: true,
});

export default Devvit;
