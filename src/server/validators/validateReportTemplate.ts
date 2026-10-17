import { SettingsValidationRequest, SettingsValidationResponse } from "@devvit/web/shared";
import type { Context } from "hono";

export const validateReportTemplate = async (c: Context): Promise<Response> => {
    const { value } = await c.req.json<SettingsValidationRequest<string>>();

    if (!value) {
        return c.json<SettingsValidationResponse>({
            success: true,
        });
    }

    const regex = /{{((?!domain|usecount)\w+)}}/;
    const matches = regex.exec(value);
    if (matches?.length === 2) {
        return c.json<SettingsValidationResponse>({
            success: false,
            error: `Invalid placeholder {{${matches[1]}}}`,
        });
    }

    if (value.length > 90) {
        return c.json<SettingsValidationResponse>({
            success: false,
            error: "Report template is too long",
        });
    }

    return c.json<SettingsValidationResponse>({
        success: true,
    });
};
