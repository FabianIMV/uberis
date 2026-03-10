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
async function getVariablesForScopeAsync(graphqlClient, { scope, includingSensitive, includeFileContent, environment, projectId, }) {
    if (scope === generated_1.EnvironmentVariableScope.Project) {
        if (includingSensitive) {
            return await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdWithSensitiveAsync(graphqlClient, {
                appId: projectId,
                environment,
                includeFileContent,
            });
        }
        return await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdAsync(graphqlClient, {
            appId: projectId,
            environment,
            includeFileContent,
        });
    }
    return includingSensitive
        ? await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.sharedWithSensitiveAsync(graphqlClient, {
            appId: projectId,
            environment,
            includeFileContent,
        })
        : await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.sharedAsync(graphqlClient, {
            appId: projectId,
            environment,
            includeFileContent,
        });
}
class EnvList extends EasCommand_1.default {
    static description = 'list environment variables for the current project or account';
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    static flags = {
        'include-sensitive': core_1.Flags.boolean({
            description: 'Display sensitive values in the output',
            default: false,
        }),
        'include-file-content': core_1.Flags.boolean({
            description: 'Display files content in the output',
            default: false,
        }),
        ...flags_1.EASMultiEnvironmentFlag,
        ...flags_1.EASVariableFormatFlag,
        ...flags_1.EASEnvironmentVariableScopeFlag,
    };
    static args = {
        environment: core_1.Args.string({
            description: "Environment to list the variables from. Default environments are 'production', 'preview', and 'development'.",
            required: false,
        }),
    };
    async runAsync() {
        const { args, flags } = await this.parse(EnvList);
        let { format, environment: environments, scope, 'include-sensitive': includeSensitive, 'include-file-content': includeFileContent, 'non-interactive': nonInteractive, } = this.sanitizeInputs(flags, args);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(EnvList, {
            nonInteractive: true,
        });
        if (!environments) {
            environments = await (0, prompts_1.promptVariableEnvironmentAsync)({
                nonInteractive,
                multiple: true,
                graphqlClient,
                projectId,
            });
        }
        await (0, variableUtils_1.performForEnvironmentsAsync)(environments, async (environment) => {
            const variables = await getVariablesForScopeAsync(graphqlClient, {
                scope,
                includingSensitive: includeSensitive,
                includeFileContent,
                environment,
                projectId,
            });
            log_1.default.addNewLineIfNone();
            if (environment) {
                log_1.default.log(chalk_1.default.bold(`Environment: ${environment.toLocaleLowerCase()}`));
            }
            if (variables.length === 0) {
                log_1.default.log('No variables found for this environment.');
                return;
            }
            if (format === 'short') {
                for (const variable of variables) {
                    log_1.default.log(`${chalk_1.default.bold(variable.name)}=${(0, variableUtils_1.formatVariableValue)(variable)}`);
                }
            }
            else {
                if (scope === generated_1.EnvironmentVariableScope.Shared) {
                    log_1.default.log(chalk_1.default.bold('Account-wide variables for this account:'));
                }
                else {
                    log_1.default.log(chalk_1.default.bold(`Variables for this project:`));
                }
                log_1.default.log(variables.map(variable => (0, variableUtils_1.formatVariable)(variable)).join(`\n\n${chalk_1.default.dim('———')}\n\n`));
            }
        });
    }
    sanitizeInputs(flags, { environment }) {
        const environments = flags.environment ?? (environment ? [environment] : undefined);
        return {
            ...flags,
            'non-interactive': flags['non-interactive'] ?? false,
            environment: environments,
            scope: flags.scope === 'account'
                ? generated_1.EnvironmentVariableScope.Shared
                : generated_1.EnvironmentVariableScope.Project,
        };
    }
}
exports.default = EnvList;
