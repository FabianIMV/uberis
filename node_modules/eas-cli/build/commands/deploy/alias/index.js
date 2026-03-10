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
const logs_1 = require("../../../worker/utils/logs");
class WorkerAlias extends EasCommand_1.default {
    static description = 'Assign deployment aliases.';
    static aliases = ['worker:alias', 'deploy:promote'];
    static state = 'preview';
    static flags = {
        prod: core_1.Flags.boolean({
            aliases: ['production'],
            description: 'Promote an existing deployment to production.',
            default: false,
        }),
        alias: core_1.Flags.string({
            description: 'Custom alias to assign to the existing deployment.',
            helpValue: 'name',
            required: false,
        }),
        id: core_1.Flags.string({
            description: 'Unique identifier of an existing deployment.',
            helpValue: 'xyz123',
            required: false,
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.ProjectDir,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags: rawFlags } = await this.parse(WorkerAlias);
        const flags = this.sanitizeFlags(rawFlags);
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const { getDynamicPrivateProjectConfigAsync, loggedIn: { graphqlClient }, } = await this.getContextAsync(WorkerAlias, {
            nonInteractive: true,
            withServerSideEnvironment: null,
        });
        const { projectId } = await getDynamicPrivateProjectConfigAsync();
        const aliasName = await resolveDeploymentAliasAsync(flags);
        const deploymentId = await resolveDeploymentIdAsync({
            ...flags,
            graphqlClient,
            projectId,
            aliasName,
        });
        let progress = null;
        let deploymentAlias = null;
        if (aliasName) {
            try {
                progress = (0, ora_1.ora)((0, chalk_1.default) `Assigning alias {bold ${aliasName}} to deployment`).start();
                deploymentAlias = await (0, deployment_1.assignWorkerDeploymentAliasAsync)({
                    graphqlClient,
                    appId: projectId,
                    deploymentId,
                    aliasName,
                });
                progress.text = (0, chalk_1.default) `Assigned alias {bold ${aliasName}} to deployment`;
            }
            catch (error) {
                progress?.fail((0, chalk_1.default) `Failed to assign {bold ${aliasName}} alias to deployment`);
                throw error;
            }
        }
        let deploymentProdAlias = null;
        if (flags.isProduction) {
            try {
                progress = (progress ?? (0, ora_1.ora)()).start((0, chalk_1.default) `Promoting deployment to {bold production}`);
                deploymentProdAlias = await (0, deployment_1.assignWorkerDeploymentProductionAsync)({
                    graphqlClient,
                    appId: projectId,
                    deploymentId,
                });
                progress.text = (0, chalk_1.default) `Promoted deployment to {bold production}`;
            }
            catch (error) {
                progress?.fail((0, chalk_1.default) `Failed to promote deployment to {bold production}`);
                throw error;
            }
        }
        progress?.succeed(!deploymentAlias
            ? (0, chalk_1.default) `Promoted deployment to {bold production}`
            : (0, chalk_1.default) `Promoted deployment to {bold production} with alias {bold ${deploymentAlias.aliasName}}`);
        // Either use the alias, or production deployment information
        const deployment = deploymentAlias?.workerDeployment ?? deploymentProdAlias?.workerDeployment;
        if (flags.json) {
            (0, json_1.printJsonOnlyOutput)((0, logs_1.formatWorkerDeploymentJson)({
                projectId,
                deployment: deployment,
                aliases: [deploymentAlias].filter(Boolean),
                production: deploymentProdAlias,
            }));
            return;
        }
        log_1.default.addNewLineIfNone();
        log_1.default.log(`🎉 Your deployment is modified`);
        log_1.default.addNewLineIfNone();
        log_1.default.log((0, logs_1.formatWorkerDeploymentTable)({
            projectId,
            deployment: deployment,
            aliases: [deploymentAlias].filter(Boolean),
            production: deploymentProdAlias,
        }));
    }
    sanitizeFlags(flags) {
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        return {
            nonInteractive,
            json,
            aliasName: flags.alias?.trim().toLowerCase(),
            deploymentIdentifier: flags.id?.trim().toLowerCase(),
            isProduction: flags.prod,
        };
    }
}
exports.default = WorkerAlias;
async function resolveDeploymentAliasAsync(flags) {
    if (flags.aliasName?.trim()) {
        return flags.aliasName.trim().toLowerCase();
    }
    // Skip alias prompt when promoting deployments to prod
    if (flags.isProduction) {
        return null;
    }
    if (flags.nonInteractive) {
        throw new Error('The `--alias` flag must be set when running in `--non-interactive` mode.');
    }
    const { alias: aliasName } = await (0, prompts_1.promptAsync)({
        type: 'text',
        name: 'alias',
        message: 'Enter the alias to assign to a deployment',
        validate: (value) => !!value.trim(),
        hint: 'The alias name is case insensitive and must be URL safe',
    });
    return aliasName.trim().toLowerCase();
}
async function resolveDeploymentIdAsync({ graphqlClient, deploymentIdentifier, aliasName, projectId, nonInteractive, }) {
    if (deploymentIdentifier) {
        return deploymentIdentifier;
    }
    if (nonInteractive) {
        throw new Error('The `--id` flag must be set when running in `--non-interactive` mode.');
    }
    const deployment = await (0, deployment_1.selectWorkerDeploymentOnAppAsync)({
        graphqlClient,
        appId: projectId,
        selectTitle: (0, chalk_1.default) `deployment to assign the {underline ${aliasName}} alias`,
    });
    if (!deployment) {
        throw new Error('No deployments found for this project, create a new deployment with "eas deploy"');
    }
    return deployment.deploymentIdentifier;
}
