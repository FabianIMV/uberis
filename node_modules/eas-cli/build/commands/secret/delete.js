"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const EnvironmentSecretMutation_1 = require("../../graphql/mutations/EnvironmentSecretMutation");
const EnvironmentSecretsQuery_1 = require("../../graphql/queries/EnvironmentSecretsQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
class EnvironmentSecretDelete extends EasCommand_1.default {
    static description = 'delete an environment secret by ID';
    static hidden = true;
    static flags = {
        id: core_1.Flags.string({
            description: 'ID of the secret to delete',
        }),
        ...flags_1.EASNonInteractiveFlag,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        log_1.default.warn('This command is deprecated. Use eas env:delete instead.');
        log_1.default.newLine();
        let { flags: { id, 'non-interactive': nonInteractive }, } = await this.parse(EnvironmentSecretDelete);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(EnvironmentSecretDelete, {
            nonInteractive,
        });
        let secret;
        if (!id) {
            const validationMessage = 'You must select which secret to delete.';
            if (nonInteractive) {
                throw new Error(validationMessage);
            }
            const secrets = await EnvironmentSecretsQuery_1.EnvironmentSecretsQuery.allAsync(graphqlClient, projectId);
            ({ secret } = await (0, prompts_1.promptAsync)({
                type: 'autocomplete',
                name: 'secret',
                message: 'Pick the secret to be deleted:',
                choices: secrets.map(secret => ({
                    title: `${secret.name} (${secret.scope})`,
                    value: secret,
                })),
            }));
            id = secret?.id;
            if (!id) {
                throw new Error(validationMessage);
            }
        }
        if (!nonInteractive) {
            log_1.default.addNewLineIfNone();
            log_1.default.warn(`You are about to permanently delete secret${secret?.name ? ` "${secret?.name}"` : ''} with id: "${id}".\nThis action is irreversible.`);
            log_1.default.newLine();
            const confirmed = await (0, prompts_1.toggleConfirmAsync)({
                message: `Are you sure you wish to proceed?${secret?.scope === EnvironmentSecretsQuery_1.EnvironmentSecretScope.ACCOUNT
                    ? ' This secret is applied across your whole account and may affect multiple apps.'
                    : ''}`,
            });
            if (!confirmed) {
                log_1.default.error(`Canceled deletion of secret${secret?.name ? ` "${secret?.name}"` : ''} with id: "${id}".`);
                process.exit(1);
            }
        }
        await EnvironmentSecretMutation_1.EnvironmentSecretMutation.deleteAsync(graphqlClient, id);
        log_1.default.withTick(`️Deleted secret${secret?.name ? ` "${secret?.name}"` : ''} with id "${id}".`);
    }
}
exports.default = EnvironmentSecretDelete;
