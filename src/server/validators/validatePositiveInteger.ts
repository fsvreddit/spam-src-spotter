import { SettingsValidationRequest, SettingsValidationResponse } from "@devvit/web/shared";
import type { Context } from "hono";

export const validateNumberGreaterThan0 = async (c: Context): Promise<Response> => {
    const { value } = await c.req.json<SettingsValidationRequest<number>>();

    return c.json<SettingsValidationResponse>(validateNumber(value, 0));
};

export const validateNumberGreaterThan1 = async (c: Context): Promise<Response> => {
    const { value } = await c.req.json<SettingsValidationRequest<number>>();
    return c.json<SettingsValidationResponse>(validateNumber(value, 1));
};

function validateNumber (value: number | undefined, min: number): SettingsValidationResponse {
    if (value === undefined) {
        return {
            success: true,
        };
    }

    if (value < min) {
        return {
            success: false,
            error: `Value must be greater than or equal to ${min}`,
        };
    }

    return {
        success: true,
    };
}
