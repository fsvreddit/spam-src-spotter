import { Hono } from "hono";
import { createServer, getServerPort } from "@devvit/web/server";
import { getRequestListener } from "@hono/node-server";
import { onAppInstall, onAppUpgrade, onModAction, onPostCreate, onPostDelete } from "./triggers";
import { validateNumberGreaterThan0, validateNumberGreaterThan1, validateReportTemplate } from "./validators";
import { handleRunCheckOnPostJob, handleStoreInitialSourceUseCountsJob } from "./tasks";

const application = new Hono();

// Triggers
application.post("/internal/triggers/app-install", onAppInstall);
application.post("/internal/triggers/app-upgrade", onAppUpgrade);
application.post("/internal/triggers/mod-action", onModAction);
application.post("/internal/triggers/post-create", onPostCreate);
application.post("/internal/triggers/post-delete", onPostDelete);

// Settings validators
application.post("/internal/validators/number-greater-than-0", validateNumberGreaterThan0);
application.post("/internal/validators/number-greater-than-1", validateNumberGreaterThan1);
application.post("/internal/validators/report-template", validateReportTemplate);

// Scheduler jobs
application.post("/internal/tasks/run-check-on-post", handleRunCheckOnPostJob);
application.post("/internal/tasks/store-initial-source-use-counts", handleStoreInitialSourceUseCountsJob);

const server = createServer(getRequestListener(application.fetch));
server.on("error", (err) => {
    console.error(`server error; ${err.stack}`);
});

const port = getServerPort();
server.listen(port);
