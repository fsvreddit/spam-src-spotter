import { Devvit } from "@devvit/public-api";
import { appSettings } from "./settings.js";
import { onAppInstall } from "./appInstallHandler.js";
import { onPostCreate } from "./postCreateHandler.js";
import { onModAction } from "./modActionHandler.js";
import { onPostDelete } from "./postRemovalHandlers.js";
import { distinctUsersForDomain, runCheckOnPost } from "./postChecker.js";

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

Devvit.addMenuItem({
    label: "Check Domain",
    location: "subreddit",
    onPress: async () => {
        const postAuthors = await distinctUsersForDomain("bbc.co.uk");
        console.log(postAuthors);
    },
});

Devvit.configure({
    redditAPI: true,
    redis: true,
    http: true,
});

export default Devvit;
