"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const generated_1 = require("../../graphql/generated");
const EnvironmentVariableMutation_1 = require("../../graphql/mutations/EnvironmentVariableMutation");
const EnvironmentVariablesQuery_1 = require("../../graphql/queries/EnvironmentVariablesQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const projectUtils_1 = require("../../project/projectUtils");
const prompts_1 = require("../../prompts");
const prompts_2 = require("../../utils/prompts");
class EnvCreate extends EasCommand_1.default {
    static description = 'create an environment variable for the current project or account';
    static args = {
        environment: core_1.Args.string({
            description: "Environment to create the variable in. Default environments are 'production', 'preview', and 'development'.",
            required: false,
        }),
    };
    static flags = {
        name: core_1.Flags.string({
            description: 'Name of the variable',
        }),
        value: core_1.Flags.string({
            description: 'Text value or the variable',
        }),
        force: core_1.Flags.boolean({
            description: 'Overwrite existing variable',
            default: false,
        }),
        type: core_1.Flags.option({
            description: 'The type of variable',
            options: ['string', 'file'],
        })(),
        ...flags_1.EASVariableVisibilityFlag,
        ...flags_1.EASEnvironmentVariableScopeFlag,
        ...flags_1.EASMultiEnvironmentFlag,
        ...flags_1.EASNonInteractiveFlag,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.Analytics,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args, flags } = await this.parse(EnvCreate);
        const validatedFlags = this.sanitizeFlags(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(EnvCreate, {
            nonInteractive: validatedFlags['non-interactive'],
        });
        const { name, value, scope, 'non-interactive': nonInteractive, environment: environments, visibility, force, type, fileName, } = await this.promptForMissingFlagsAsync(validatedFlags, args, {
            graphqlClient,
            projectId,
        });
        const [projectDisplayName, ownerAccount] = await Promise.all([
            (0, projectUtils_1.getDisplayNameForProjectIdAsync)(graphqlClient, projectId),
            (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(graphqlClient, projectId),
        ]);
        let overwrite = false;
        if (scope === generated_1.EnvironmentVariableScope.Project) {
            const existingVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdAsync(graphqlClient, {
                appId: projectId,
                filterNames: [name],
            });
            const existingVariable = existingVariables.find(variable => !environments || variable.environments?.some(env => environments?.includes(env)));
            if (existingVariable) {
                if (existingVariable.scope === generated_1.EnvironmentVariableScope.Project) {
                    await this.promptForOverwriteAsync({
                        nonInteractive,
                        force,
                        message: `Variable ${name} already exists on this project.`,
                        suggestion: 'Do you want to overwrite it?',
                    });
                    overwrite = true;
                }
            }
            const variable = overwrite && existingVariable
                ? await EnvironmentVariableMutation_1.EnvironmentVariableMutation.updateAsync(graphqlClient, {
                    id: existingVariable.id,
                    name,
                    value,
                    visibility,
                    environments,
                    type,
                    fileName,
                })
                : await EnvironmentVariableMutation_1.EnvironmentVariableMutation.createForAppAsync(graphqlClient, {
                    name,
                    value,
                    environments,
                    visibility,
                    type: type ?? generated_1.EnvironmentSecretType.String,
                    fileName,
                }, projectId);
            if (!variable) {
                throw new Error(`Could not create variable with name ${name} on project ${projectDisplayName}`);
            }
            log_1.default.withTick(`Created a new variable ${chalk_1.default.bold(name)} on project ${chalk_1.default.bold(projectDisplayName)}.`);
        }
        else if (scope === generated_1.EnvironmentVariableScope.Shared) {
            const existingVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.sharedAsync(graphqlClient, {
                appId: projectId,
                filterNames: [name],
            });
            const existingVariable = existingVariables.find(variable => !environments || variable.environments?.some(env => environments?.includes(env)));
            if (existingVariable) {
                if (force) {
                    overwrite = true;
                }
                else {
                    throw new Error(`Account-wide variable with ${name} name already exists on this account.\n` +
                        `Use a different name or delete the existing variable on website or by using the "eas env:delete --name ${name} --scope account" command.`);
                }
            }
            const variable = overwrite && existingVariable
                ? await EnvironmentVariableMutation_1.EnvironmentVariableMutation.updateAsync(graphqlClient, {
                    id: existingVariable.id,
                    name,
                    value,
                    visibility,
                    environments,
                    type,
                })
                : await EnvironmentVariableMutation_1.EnvironmentVariableMutation.createSharedVariableAsync(graphqlClient, {
                    name,
                    value,
                    visibility,
                    environments,
                    type: type ?? generated_1.EnvironmentSecretType.String,
                }, ownerAccount.id);
            if (!variable) {
                throw new Error(`Could not create variable with name ${name} on account ${ownerAccount.name}`);
            }
            log_1.default.withTick(`Created a new variable ${chalk_1.default.bold(name)} on account ${chalk_1.default.bold(ownerAccount.name)}.`);
        }
    }
    async promptForOverwriteAsync({ nonInteractive, force, message, suggestion, }) {
        if (!nonInteractive) {
            const confirmation = await (0, prompts_1.confirmAsync)({
                message: `${message} ${suggestion}`,
            });
            if (!confirmation) {
                log_1.default.log('Aborting');
                throw new Error(`${message}`);
            }
        }
        else if (!force) {
            throw new Error(`${message} Use --force to overwrite it.`);
        }
    }
    async promptForMissingFlagsAsync({ name, value, environment: environments, visibility, 'non-interactive': nonInteractive, type, ...rest }, { environment }, { graphqlClient, projectId }) {
        if (!name) {
            name = await (0, prompts_2.promptVariableNameAsync)(nonInteractive);
        }
        let newType;
        let newVisibility = visibility ? (0, prompts_2.parseVisibility)(visibility) : undefined;
        if (type === 'file') {
            newType = generated_1.EnvironmentSecretType.FileBase64;
        }
        else if (type === 'string') {
            newType = generated_1.EnvironmentSecretType.String;
        }
        if (!type && !value && !nonInteractive) {
            newType = await (0, prompts_2.promptVariableTypeAsync)(nonInteractive);
        }
        if (!newVisibility) {
            newVisibility = await (0, prompts_2.promptVariableVisibilityAsync)(nonInteractive);
        }
        if (!value) {
            value = await (0, prompts_2.promptVariableValueAsync)({
                nonInteractive,
                hidden: newVisibility !== generated_1.EnvironmentVariableVisibility.Public,
                filePath: newType === generated_1.EnvironmentSecretType.FileBase64,
            });
        }
        let environmentFilePath;
        let fileName;
        if (newType === generated_1.EnvironmentSecretType.FileBase64) {
            environmentFilePath = path_1.default.resolve(value);
            if (!(await fs_extra_1.default.pathExists(environmentFilePath))) {
                throw new Error(`File "${value}" does not exist`);
            }
            fileName = path_1.default.basename(environmentFilePath);
        }
        value = environmentFilePath ? await fs_extra_1.default.readFile(environmentFilePath, 'base64') : value;
        let newEnvironments = environments ?? (environment ? [environment] : undefined);
        if (!newEnvironments) {
            newEnvironments = await (0, prompts_2.promptVariableEnvironmentAsync)({
                nonInteractive,
                multiple: true,
                canEnterCustomEnvironment: true,
                graphqlClient,
                projectId,
            });
            if (!newEnvironments || newEnvironments.length === 0) {
                throw new Error('No environments selected');
            }
        }
        newVisibility = newVisibility ?? generated_1.EnvironmentVariableVisibility.Public;
        return {
            name,
            value,
            environment: newEnvironments,
            visibility: newVisibility,
            force: rest.force ?? false,
            'non-interactive': nonInteractive,
            type: newType,
            fileName,
            ...rest,
        };
    }
    sanitizeFlags(flags) {
        return {
            ...flags,
            scope: flags.scope === 'account'
                ? generated_1.EnvironmentVariableScope.Shared
                : generated_1.EnvironmentVariableScope.Project,
        };
    }
}
exports.default = EnvCreate;
