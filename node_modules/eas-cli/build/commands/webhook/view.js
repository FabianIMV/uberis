"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const WebhookQuery_1 = require("../../graphql/queries/WebhookQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const ora_1 = require("../../ora");
const formatWebhook_1 = require("../../webhooks/formatWebhook");
class WebhookView extends EasCommand_1.default {
    static description = 'view a webhook';
    static args = {
        ID: core_1.Args.string({
            required: true,
            description: 'ID of the webhook to view',
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args: { ID: webhookId }, } = await this.parse(WebhookView);
        const { loggedIn: { graphqlClient }, } = await this.getContextAsync(WebhookView, { nonInteractive: true });
        const spinner = (0, ora_1.ora)(`Fetching the webhook details for ID ${webhookId}`).start();
        try {
            const webhook = await WebhookQuery_1.WebhookQuery.byIdAsync(graphqlClient, webhookId);
            spinner.succeed(`Found the webhook details`);
            log_1.default.log(`\n${(0, formatWebhook_1.formatWebhook)(webhook)}`);
        }
        catch (err) {
            spinner.fail(`Couldn't find the webhook with ID ${webhookId}`);
            throw err;
        }
    }
}
exports.default = WebhookView;
