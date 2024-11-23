import { SettingsFormField } from "@devvit/public-api";

export enum AppSetting {
    SourceThreshold = "sourceThreshold",
    CheckAfterApproval = "checkAfterApproval",
    ReportTemplate = "reportTemplate",
    UserLimit = "userLimit",
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
            },
            {
                type: "boolean",
                name: AppSetting.CheckAfterApproval,
                label: "Check posts after approving out of the modqueue",
                helpText: "If disabled, posts will only be checked if they were not modqueued.",
                defaultValue: true,
            },
            {
                type: "number",
                name: AppSetting.UserLimit,
                label: "Only count posts if fewer than this many users have submitted this domain out of the most recent 100 posts for the domain",
                helpText: "If a domain has been submitted by lots of different users, it's less likely to be suspect. Set to zero to disable this check.",
                defaultValue: 10,
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
                    if (value) {
                        const regex = /{{((?!domain|usecount)\w+)}}/;
                        const matches = regex.exec(value);
                        if (matches && matches.length === 2) {
                            return `Invalid placeholder {{${matches[1]}}}`;
                        }
                    }
                },
            },
        ],
    },
];
