"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const EasCommand_1 = tslib_1.__importDefault(require("../../../commandUtils/EasCommand"));
const flags_1 = require("../../../commandUtils/flags");
const log_1 = tslib_1.__importDefault(require("../../../log"));
const ora_1 = require("../../../ora");
const prompts_1 = require("../../../prompts");
const json_1 = require("../../../utils/json");
const deployment_1 = require("../../../worker/deployment");
class WorkerAliasDelete extends EasCommand_1.default {
    static description = 'Delete deployment aliases.';
    static aliases = ['worker:alias:delete'];
    static state = 'preview';
    static args = {
        ALIAS_NAME: core_1.Args.string({}),
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
        const { args: { ALIAS_NAME: aliasNameFromArg }, flags: rawFlags, } = await this.parse(WorkerAliasDelete);
        const flags = this.sanitizeFlags(rawFlags);
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const { getDynamicPrivateProjectConfigAsync, loggedIn: { graphqlClient }, } = await this.getContextAsync(WorkerAliasDelete, {
            nonInteractive: true,
            withServerSideEnvironment: null,
        });
        const { projectId } = await getDynamicPrivateProjectConfigAsync();
        const aliasName = await resolveDeploymentAliasAsync(flags, graphqlClient, projectId, aliasNameFromArg);
        const isProduction = !aliasName;
        if (!flags.nonInteractive) {
            log_1.default.addNewLineIfNone();
            log_1.default.warn(isProduction
                ? `You are about to delete your production alias`
                : `You are about to delete alias: "${aliasName}"`);
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
            progress = (0, ora_1.ora)((0, chalk_1.default) `Deleting alias {bold ${aliasName ?? 'production'}}`).start();
            deleteResult = await (0, deployment_1.deleteWorkerDeploymentAliasAsync)({
                graphqlClient,
                appId: projectId,
                aliasName,
            });
            progress.text = (0, chalk_1.default) `Deleted alias {bold ${aliasName ?? 'production'}}`;
        }
        catch (error) {
            progress?.fail((0, chalk_1.default) `Failed to delete alias {bold ${aliasName ?? 'production'}}`);
            throw error;
        }
        progress?.succeed((0, chalk_1.default) `Deleted alias {bold ${aliasName ?? 'production'}}`);
        if (flags.json) {
            (0, json_1.printJsonOnlyOutput)({
                aliasName: deleteResult.aliasName,
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
exports.default = WorkerAliasDelete;
async function resolveDeploymentAliasAsync(flags, graphqlClient, projectId, aliasNameFromArg) {
    if (aliasNameFromArg?.trim()) {
        return aliasNameFromArg.trim().toLowerCase();
    }
    if (flags.nonInteractive) {
        throw new Error('Alias name must be provided in non-interactive mode');
    }
    const alias = await (0, deployment_1.selectWorkerDeploymentAliasOnAppAsync)({
        graphqlClient,
        appId: projectId,
        selectTitle: 'alias to delete',
    });
    if (!alias) {
        throw new Error('No aliases found for this project, create aliases with "eas deploy:alias"');
    }
    return alias.aliasName;
}
