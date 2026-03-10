"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const log_1 = tslib_1.__importDefault(require("../../log"));
const ora_1 = require("../../ora");
const prompts_1 = require("../../prompts");
const json_1 = require("../../utils/json");
const deployment_1 = require("../../worker/deployment");
class WorkerDelete extends EasCommand_1.default {
    static description = 'Delete a deployment.';
    static aliases = ['worker:delete'];
    static state = 'preview';
    static args = {
        DEPLOYMENT_ID: core_1.Args.string({}),
    };
    static flags = {
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.ProjectDir,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args: { DEPLOYMENT_ID: deploymentIdFromArg }, flags: rawFlags, } = await this.parse(WorkerDelete);
        const flags = this.sanitizeFlags(rawFlags);
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const { getDynamicPrivateProjectConfigAsync, loggedIn: { graphqlClient }, } = await this.getContextAsync(WorkerDelete, {
            nonInteractive: true,
            withServerSideEnvironment: null,
        });
        const { projectId } = await getDynamicPrivateProjectConfigAsync();
        if (!deploymentIdFromArg) {
            if (flags.nonInteractive) {
                throw new Error('Deployment ID must be provided in non-interactive mode');
            }
            throw new Error('Deployment ID is required');
        }
        if (!flags.nonInteractive) {
            log_1.default.addNewLineIfNone();
            log_1.default.warn(`You are about to permanently delete deployment with ID: "${deploymentIdFromArg}"` +
                `\nThis action is irreversible.`);
            log_1.default.newLine();
            const confirmed = await (0, prompts_1.toggleConfirmAsync)({ message: 'Are you sure you wish to proceed?' });
            if (!confirmed) {
                log_1.default.log('Aborted.');
                return;
            }
        }
        let progress = null;
        let deleteResult = null;
        try {
            progress = (0, ora_1.ora)((0, chalk_1.default) `Deleting deployment {bold ${deploymentIdFromArg}}`).start();
            deleteResult = await (0, deployment_1.deleteWorkerDeploymentAsync)({
                graphqlClient,
                appId: projectId,
                deploymentIdentifier: deploymentIdFromArg,
            });
            progress.text = (0, chalk_1.default) `Deleted deployment {bold ${deploymentIdFromArg}}`;
        }
        catch (error) {
            progress?.fail((0, chalk_1.default) `Failed to delete deployment {bold ${deploymentIdFromArg}}`);
            throw error;
        }
        progress?.succeed((0, chalk_1.default) `Deleted deployment {bold ${deploymentIdFromArg}}`);
        if (flags.json) {
            (0, json_1.printJsonOnlyOutput)({
                deploymentId: deleteResult.deploymentIdentifier,
                id: deleteResult.id,
            });
        }
    }
    sanitizeFlags(flags) {
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        return {
            nonInteractive,
            json,
        };
    }
}
exports.default = WorkerDelete;
