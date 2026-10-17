import { TaskRequest, TaskResponse } from "@devvit/web/server";
import { Context } from "hono";
import { storeInitialSourceUseCounts } from "../core";

export type InstallJobData = {
    jobGuid: string;
};

export const handleStoreInitialSourceUseCountsJob = async (c: Context): Promise<Response> => {
    const request = await c.req.json<TaskRequest<InstallJobData>>();

    await storeInitialSourceUseCounts(request);

    return c.json<TaskResponse>({ message: "Handled store initial source use counts job." }, 200);
};
