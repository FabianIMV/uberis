"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const generated_1 = require("../../graphql/generated");
const EnvironmentVariablesQuery_1 = require("../../graphql/queries/EnvironmentVariablesQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../utils/prompts");
const variableUtils_1 = require("../../utils/variableUtils");
class EnvGet extends EasCommand_1.default {
    static description = 'view an environment variable for the current project or account';
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    static args = {
        environment: core_1.Args.string({
            description: "Current environment of the variable. Default environments are 'production', 'preview', and 'development'.",
            required: false,
        }),
    };
    static flags = {
        'variable-name': core_1.Flags.string({
            description: 'Name of the variable',
        }),
        'variable-environment': core_1.Flags.string({
            ...flags_1.EasEnvironmentFlagParameters,
            description: 'Current environment of the variable',
        }),
        ...flags_1.EASVariableFormatFlag,
        ...flags_1.EASEnvironmentVariableScopeFlag,
        ...flags_1.EASNonInteractiveFlag,
    };
    async runAsync() {
        const { args, flags } = await this.parse(EnvGet);
        let { 'variable-environment': environment, 'variable-name': name, 'non-interactive': nonInteractive, format, scope, } = this.sanitizeInputs(flags, args);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(EnvGet, {
            nonInteractive,
        });
        if (!name) {
            name = await (0, prompts_1.promptVariableNameAsync)(nonInteractive);
        }
        if (!environment) {
            environment = await (0, prompts_1.promptVariableEnvironmentAsync)({
                nonInteractive,
                multiple: false,
                graphqlClient,
                projectId,
            });
        }
        const variables = await getVariablesAsync(graphqlClient, scope, projectId, name, environment);
        if (variables.length === 0) {
            log_1.default.error(`Variable with name "${name}" not found`);
            return;
        }
        let variable;
        if (variables.length > 1) {
            const variableInEnvironment = variables.find(v => v.environments?.includes(environment));
            if (!variableInEnvironment) {
                throw new Error(`Variable with name "${name}" not found in environment "${environment.toLocaleLowerCase()}"`);
            }
            variable = variableInEnvironment;
        }
        else {
            variable = variables[0];
        }
        if (variable.visibility === generated_1.EnvironmentVariableVisibility.Secret) {
            throw new Error(`${chalk_1.default.bold(variable.name)} is a secret variable and cannot be displayed once it has been created.`);
        }
        if (format === 'short') {
            log_1.default.log(`${chalk_1.default.bold(variable.name)}=${(0, variableUtils_1.formatVariableValue)(variable)}`);
        }
        else {
            log_1.default.log((0, variableUtils_1.formatVariable)(variable));
        }
    }
    sanitizeInputs(flags, { environment }) {
        if (flags['non-interactive']) {
            if (!flags['variable-name']) {
                throw new Error('Variable name is required. Run the command with --variable-name flag.');
            }
            if (!flags.scope) {
                throw new Error('Scope is required. Run the command with --scope flag.');
            }
            if (!(flags['variable-environment'] ?? environment)) {
                throw new Error('Environment is required.');
            }
        }
        if (environment && flags['variable-environment']) {
            throw new Error("You can't use both --variable-environment flag when environment is passed as an argument. Run `eas env:get --help` for more information.");
        }
        const scope = flags.scope === 'account'
            ? generated_1.EnvironmentVariableScope.Shared
            : generated_1.EnvironmentVariableScope.Project;
        if (environment) {
            return {
                ...flags,
                'variable-environment': environment,
                scope,
            };
        }
        return { ...flags, scope };
    }
}
exports.default = EnvGet;
async function getVariablesAsync(graphqlClient, scope, projectId, name, environment) {
    if (!name) {
        throw new Error("Variable name is required. Run the command with '--variable-name VARIABLE_NAME' flag.");
    }
    if (scope === generated_1.EnvironmentVariableScope.Project) {
        const appVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdWithSensitiveAsync(graphqlClient, {
            appId: projectId,
            environment,
            filterNames: [name],
            includeFileContent: true,
        });
        return appVariables;
    }
    else {
        const sharedVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.sharedWithSensitiveAsync(graphqlClient, {
            appId: projectId,
            filterNames: [name],
            includeFileContent: true,
        });
        return sharedVariables;
    }
}
