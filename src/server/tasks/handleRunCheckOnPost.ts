import { TaskRequest, TaskResponse } from "@devvit/web/server";
import { Context } from "hono";
import { runCheckOnPost } from "../core";

export type PostCheckJobData = {
    jobGuid: string;
    postId: string;
};

export const handleRunCheckOnPostJob = async (c: Context): Promise<Response> => {
    const request = await c.req.json<TaskRequest<PostCheckJobData>>();

    await runCheckOnPost(request);

    return c.json<TaskResponse>({ message: "Handled run check on post job." }, 200);
};
