"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const generated_1 = require("../../graphql/generated");
const WebhookMutation_1 = require("../../graphql/mutations/WebhookMutation");
const ora_1 = require("../../ora");
const input_1 = require("../../webhooks/input");
class WebhookCreate extends EasCommand_1.default {
    static description = 'create a webhook';
    static flags = {
        event: core_1.Flags.option({
            description: 'Event type that triggers the webhook',
            options: [generated_1.WebhookType.Build, generated_1.WebhookType.Submit],
        })(),
        url: core_1.Flags.string({
            description: 'Webhook URL',
        }),
        secret: core_1.Flags.string({
            description: "Secret used to create a hash signature of the request payload, provided in the 'Expo-Signature' header.",
        }),
        ...flags_1.EASNonInteractiveFlag,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags } = await this.parse(WebhookCreate);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(WebhookCreate, {
            nonInteractive: flags['non-interactive'],
        });
        const webhookInputParams = await (0, input_1.prepareInputParamsAsync)(flags);
        const spinner = (0, ora_1.ora)('Creating a webhook').start();
        try {
            await WebhookMutation_1.WebhookMutation.createWebhookAsync(graphqlClient, projectId, webhookInputParams);
            spinner.succeed('Successfully created a webhook');
        }
        catch (err) {
            spinner.fail('Failed to create a webhook');
            throw err;
        }
    }
}
exports.default = WebhookCreate;
