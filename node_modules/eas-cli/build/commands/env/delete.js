"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const assert_1 = tslib_1.__importDefault(require("assert"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const generated_1 = require("../../graphql/generated");
const EnvironmentVariableMutation_1 = require("../../graphql/mutations/EnvironmentVariableMutation");
const EnvironmentVariablesQuery_1 = require("../../graphql/queries/EnvironmentVariablesQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const variableUtils_1 = require("../../utils/variableUtils");
class EnvDelete extends EasCommand_1.default {
    static description = 'delete an environment variable for the current project or account';
    static flags = {
        'variable-name': core_1.Flags.string({
            description: 'Name of the variable to delete',
        }),
        'variable-environment': core_1.Flags.string({
            ...flags_1.EasEnvironmentFlagParameters,
            description: 'Current environment of the variable to delete',
        }),
        ...flags_1.EASEnvironmentVariableScopeFlag,
        ...flags_1.EASNonInteractiveFlag,
    };
    static args = {
        environment: core_1.Args.string({
            description: "Current environment of the variable to delete. Default environments are 'production', 'preview', and 'development'.",
            required: false,
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args, flags } = await this.parse(EnvDelete);
        const { 'variable-name': name, 'variable-environment': environment, 'non-interactive': nonInteractive, scope, } = this.sanitizeInputs(flags, args);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(EnvDelete, {
            nonInteractive,
        });
        const variables = scope === generated_1.EnvironmentVariableScope.Project
            ? await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdAsync(graphqlClient, {
                appId: projectId,
                environment,
            })
            : await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.sharedAsync(graphqlClient, {
                appId: projectId,
                environment,
            });
        let selectedVariable;
        if (!name) {
            ({ variable: selectedVariable } = await (0, prompts_1.promptAsync)({
                type: 'select',
                name: 'variable',
                message: 'Pick the variable to be deleted:',
                choices: variables
                    .filter(({ scope: variableScope }) => scope === variableScope)
                    .map(variable => {
                    return {
                        title: (0, variableUtils_1.formatVariableName)(variable),
                        value: variable,
                    };
                }),
            }));
        }
        else {
            const selectedVariables = variables.filter(variable => variable.name === name && (!environment || variable.environments?.includes(environment)));
            if (selectedVariables.length !== 1) {
                if (selectedVariables.length === 0) {
                    throw new Error(`Variable "${name}" not found.`);
                }
                else {
                    throw new Error(`Multiple variables with name "${name}" found. Please select the variable to delete interactively or run command with --variable-environment ENVIRONMENT option.`);
                }
            }
            selectedVariable = selectedVariables[0];
        }
        (0, assert_1.default)(selectedVariable, `Variable "${name}" not found.`);
        if (!nonInteractive) {
            log_1.default.addNewLineIfNone();
            log_1.default.warn(`You are about to permanently delete variable ${selectedVariable.name}.`);
            log_1.default.warn('This action is irreversible.');
            log_1.default.newLine();
            const confirmed = await (0, prompts_1.toggleConfirmAsync)({
                message: `Are you sure you wish to proceed?${selectedVariable.scope === generated_1.EnvironmentVariableScope.Shared
                    ? ' This variable is applied across your whole account and may affect multiple apps.'
                    : ''}`,
            });
            if (!confirmed) {
                log_1.default.error(`Canceled deletion of variable ${selectedVariable.name}.`);
                throw new Error(`Variable "${selectedVariable.name}" not deleted.`);
            }
        }
        await EnvironmentVariableMutation_1.EnvironmentVariableMutation.deleteAsync(graphqlClient, selectedVariable.id);
        log_1.default.withTick(`️Deleted variable ${selectedVariable.name}".`);
    }
    sanitizeInputs(flags, { environment }) {
        if (flags['non-interactive']) {
            if (!flags['variable-name']) {
                throw new Error(`Environment variable needs 'name' to be specified when running in non-interactive mode. Run the command with ${chalk_1.default.bold('--variable-name VARIABLE_NAME')} flag to fix the issue`);
            }
        }
        const scope = flags.scope === 'account'
            ? generated_1.EnvironmentVariableScope.Shared
            : generated_1.EnvironmentVariableScope.Project;
        if (environment) {
            return { ...flags, 'variable-environment': environment, scope };
        }
        return { ...flags, scope };
    }
}
exports.default = EnvDelete;
