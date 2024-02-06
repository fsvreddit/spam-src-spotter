import {SettingsFormField} from "@devvit/public-api";

export enum AppSetting {
    SourceThreshold = "sourceThreshold",
    ReportTemplate = "reportTemplate",
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
                defaultValue: 5,
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
                defaultValue: "Potential problem domain. {{domain}} has been seen {{usecount}} time.",
                onValidate: ({value}) => {
                    if (value) {
                        const regex = /{{((?!domain|usecount)\w+)}}/;
                        const matches = value.match(regex);
                        if (matches && matches.length === 2) {
                            return `Invalid placeholder {{${matches[1]}}}`;
                        }
                    }
                },
            },
        ],
    },
];
