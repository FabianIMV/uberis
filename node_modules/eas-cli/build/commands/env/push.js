"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const generated_1 = require("../../graphql/generated");
const EnvironmentVariableMutation_1 = require("../../graphql/mutations/EnvironmentVariableMutation");
const EnvironmentVariablesQuery_1 = require("../../graphql/queries/EnvironmentVariablesQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const prompts_2 = require("../../utils/prompts");
class EnvPush extends EasCommand_1.default {
    static description = 'push environment variables from .env file to the selected environment';
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    static flags = {
        ...flags_1.EASMultiEnvironmentFlag,
        path: core_1.Flags.string({
            description: 'Path to the input `.env` file',
            default: '.env.local',
        }),
        force: core_1.Flags.boolean({
            description: 'Skip confirmation and automatically override existing variables',
            default: false,
        }),
    };
    static args = {
        environment: core_1.Args.string({
            description: "Environment to push variables to. Default environments are 'production', 'preview', and 'development'.",
            required: false,
        }),
    };
    async runAsync() {
        const { args, flags } = await this.parse(EnvPush);
        let { environment: environments, path: envPath, force } = this.parseFlagsAndArgs(flags, args);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(EnvPush, {
            nonInteractive: false,
        });
        if (!environments) {
            environments = await (0, prompts_2.promptVariableEnvironmentAsync)({
                nonInteractive: false,
                multiple: true,
                canEnterCustomEnvironment: true,
                graphqlClient,
                projectId,
            });
        }
        const updateVariables = await this.parseEnvFileAsync(envPath, environments);
        const variableNames = Object.keys(updateVariables);
        for (const environment of environments) {
            const displayedEnvironment = environment.toLocaleLowerCase();
            const existingVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdAsync(graphqlClient, {
                appId: projectId,
                environment,
                filterNames: variableNames,
            });
            const existingDifferentVariables = [];
            // Remove variables that are the same as the ones in the environment
            existingVariables.forEach(existingVariable => {
                const existingVariableUpdate = updateVariables[existingVariable.name];
                if (existingVariableUpdate) {
                    const hasMoreEnvironments = existingVariableUpdate.environments.some(newEnv => !existingVariable.environments?.includes(newEnv));
                    if (existingVariableUpdate.value !== existingVariable.value || hasMoreEnvironments) {
                        existingDifferentVariables.push(existingVariable);
                    }
                    else {
                        delete updateVariables[existingVariable.name];
                    }
                }
            });
            const existingDifferentSharedVariables = existingDifferentVariables.filter(variable => variable.scope === generated_1.EnvironmentVariableScope.Shared);
            if (existingDifferentSharedVariables.length > 0) {
                const existingDifferentSharedVariablesNames = existingDifferentSharedVariables.map(variable => variable.name);
                log_1.default.error('Account-wide variables cannot be overwritten by eas env:push command.');
                log_1.default.error('Remove them from the env file or unlink them from the project to continue:');
                existingDifferentSharedVariablesNames.forEach(name => {
                    log_1.default.error(`- ${name}`);
                });
                throw new Error('Account-wide variables cannot be overwritten by eas env:push command');
            }
            if (existingDifferentVariables.length > 0) {
                log_1.default.warn(`Some variables already exist in the ${displayedEnvironment} environment.`);
                const variableNames = existingDifferentVariables.map(variable => variable.name);
                let variablesToOverwrite = [];
                if (force) {
                    // When --force is used, automatically override all existing variables
                    log_1.default.log('Using --force flag: automatically overriding existing variables.');
                    variablesToOverwrite = existingDifferentVariables.map(variable => variable.name);
                }
                else {
                    const confirmationMessage = variableNames.length > 1
                        ? `The ${variableNames.join(', ')} environment variables already exist in ${displayedEnvironment} environment. Do you want to override them all?`
                        : `The ${variableNames[0]} environment variable already exists in ${displayedEnvironment} environment. Do you want to override it?`;
                    const confirm = await (0, prompts_1.confirmAsync)({
                        message: confirmationMessage,
                    });
                    if (!confirm && existingDifferentVariables.length === 0) {
                        throw new Error('No new variables to push.');
                    }
                    if (confirm) {
                        variablesToOverwrite = existingDifferentVariables.map(variable => variable.name);
                    }
                    else {
                        const promptResult = await (0, prompts_1.promptAsync)({
                            type: 'multiselect',
                            name: 'variablesToOverwrite',
                            message: 'Select variables to overwrite:',
                            // @ts-expect-error property missing from `@types/prompts`
                            optionsPerPage: 20,
                            choices: existingDifferentVariables.map(variable => ({
                                title: `${variable.name}: ${updateVariables[variable.name].value} (was ${variable.value ?? '(secret)'})`,
                                value: variable.name,
                            })),
                        });
                        variablesToOverwrite = promptResult.variablesToOverwrite;
                    }
                }
                for (const existingVariable of existingVariables) {
                    const name = existingVariable.name;
                    if (variablesToOverwrite.includes(name)) {
                        updateVariables[name]['overwrite'] = true;
                    }
                    else {
                        delete updateVariables[name];
                    }
                }
            }
            // Check if any of the sensitive variables already exist in the environment. Prompt the user to overwrite them.
            const existingSensitiveVariables = existingVariables.filter(variable => variable.visibility !== generated_1.EnvironmentVariableVisibility.Public);
            if (existingSensitiveVariables.length > 0 && !force) {
                const existingSensitiveVariablesNames = existingSensitiveVariables.map(variable => `- ${variable.name}`);
                const confirm = await (0, prompts_1.confirmAsync)({
                    message: `You are about to overwrite sensitive variables.\n${existingSensitiveVariablesNames.join('\n')}\n Do you want to continue?`,
                });
                if (!confirm) {
                    throw new Error('Aborting...');
                }
            }
            else if (existingSensitiveVariables.length > 0 && force) {
                log_1.default.log('Using --force flag: automatically overriding sensitive variables.');
            }
        }
        const variablesToPush = Object.values(updateVariables);
        if (variablesToPush.length === 0) {
            log_1.default.log('No new variables to push.');
            return;
        }
        await EnvironmentVariableMutation_1.EnvironmentVariableMutation.createBulkEnvironmentVariablesForAppAsync(graphqlClient, variablesToPush, projectId);
        log_1.default.log(`Uploaded env file to ${environments.join(', ').toLocaleLowerCase()}.`);
    }
    parseFlagsAndArgs(flags, { environment }) {
        const environments = flags.environment ?? (environment ? [environment] : undefined);
        return {
            ...flags,
            environment: environments,
        };
    }
    async parseEnvFileAsync(envPath, environments) {
        if (!(await fs_extra_1.default.exists(envPath))) {
            throw new Error(`File ${envPath} does not exist.`);
        }
        const pushInput = {};
        const variables = dotenv_1.default.parse(await fs_extra_1.default.readFile(envPath, 'utf8'));
        const hasFileVariables = Object.values(variables).some(value => value.includes(path_1.default.join('.eas', '.env')));
        if (hasFileVariables) {
            log_1.default.warn('File variables are not supported in this command.');
        }
        for (const [name, value] of Object.entries(variables)) {
            // Skip file variables
            const fileVariablePath = path_1.default.join('.eas', '.env', name);
            if (value.endsWith(fileVariablePath)) {
                log_1.default.warn(`Skipping file variable ${name}`);
                continue;
            }
            pushInput[name] = {
                name,
                value,
                environments,
                visibility: name.startsWith('EXPO_PUBLIC_')
                    ? generated_1.EnvironmentVariableVisibility.Public
                    : generated_1.EnvironmentVariableVisibility.Sensitive,
            };
        }
        return pushInput;
    }
}
exports.default = EnvPush;
