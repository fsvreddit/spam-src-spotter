import { SettingsFormField } from "@devvit/public-api";

export enum AppSetting {
    SourceThreshold = "sourceThreshold",
    UserCountThreshold = "userCountThreshold",
    CheckAfterApproval = "checkAfterApproval",
    ReportTemplate = "reportTemplate",
}

function validatePositiveInteger (input: number | undefined, minimum = 0): string | undefined {
    if (input === undefined || input < minimum || !Number.isInteger(input)) {
        return `Value must be a whole number greater than or equal to ${minimum}.`;
    }
}

export const appSettings: SettingsFormField[] = [
    {
        type: "group",
        label: "Detection Options",
        fields: [
            {
                type: "number",
                name: AppSetting.SourceThreshold,
                label: "Act on sources that have been seen this many times or less",
                helpText: "If 0, no sources will be detected as potentially problematic. It can be useful to run with this value on busy subreddits to build up datasets.",
                defaultValue: 2,
                onValidate: input => validatePositiveInteger(input.value, 1),
            },
            {
                type: "number",
                name: AppSetting.UserCountThreshold,
                label: "Act on sources that have been recently seen from this many users or less",
                helpText: "If 0, sources will be detected regardless of how many users have posted them. I recommend setting the value to a low but non-zero value to ignore false alarms from sources that are shared by many users.",
                defaultValue: 10,
                onValidate: input => validatePositiveInteger(input.value, 0),
            },
            {
                type: "boolean",
                name: AppSetting.CheckAfterApproval,
                label: "Check posts after approving out of the modqueue",
                helpText: "If disabled, posts will only be checked if they were not modqueued.",
                defaultValue: true,
            },
        ],
    },
    {
        type: "group",
        label: "Action Options",
        fields: [
            {
                type: "string",
                name: AppSetting.ReportTemplate,
                label: "Template for report text",
                helpText: "Placeholders supported: {{domain}}, {{usecount}}",
                defaultValue: "Potential problem domain. {{domain}} has been seen {{usecount}} time(s).",
                onValidate: ({ value }) => {
                    if (!value) {
                        return;
                    }

                    const regex = /{{((?!domain|usecount)\w+)}}/;
                    const matches = regex.exec(value);
                    if (matches?.length === 2) {
                        return `Invalid placeholder {{${matches[1]}}}`;
                    }

                    if (value.length > 90) {
                        return "Report template is too long";
                    }
                },
            },
        ],
    },
];
