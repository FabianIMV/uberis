"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const assert_1 = tslib_1.__importDefault(require("assert"));
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
const variableUtils_1 = require("../../utils/variableUtils");
class EnvUpdate extends EasCommand_1.default {
    static description = 'update an environment variable on the current project or account';
    static flags = {
        'variable-name': core_1.Flags.string({
            description: 'Current name of the variable',
        }),
        'variable-environment': core_1.Flags.string({
            ...flags_1.EasEnvironmentFlagParameters,
            description: 'Current environment of the variable to update',
        }),
        name: core_1.Flags.string({
            description: 'New name of the variable',
        }),
        value: core_1.Flags.string({
            description: 'New value or the variable',
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
    static args = {
        environment: core_1.Args.string({
            description: "Current environment of the variable to update. Default environments are 'production', 'preview', and 'development'.",
            required: false,
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.Analytics,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args, flags } = await this.parse(EnvUpdate);
        const { name, value: rawValue, scope, 'variable-name': currentName, 'variable-environment': currentEnvironment, 'non-interactive': nonInteractive, environment: environments, type, visibility, } = this.sanitizeInputs(flags, args);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(EnvUpdate, {
            nonInteractive,
        });
        const [projectDisplayName, ownerAccount] = await Promise.all([
            (0, projectUtils_1.getDisplayNameForProjectIdAsync)(graphqlClient, projectId),
            (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(graphqlClient, projectId),
        ]);
        let selectedVariable;
        let existingVariables = [];
        const suffix = scope === generated_1.EnvironmentVariableScope.Project
            ? `on project ${projectDisplayName}`
            : `on account ${ownerAccount.name}`;
        if (scope === generated_1.EnvironmentVariableScope.Project) {
            existingVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdAsync(graphqlClient, {
                appId: projectId,
                environment: currentEnvironment,
                filterNames: currentName ? [currentName] : undefined,
            });
        }
        if (scope === generated_1.EnvironmentVariableScope.Shared) {
            existingVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.sharedAsync(graphqlClient, {
                appId: projectId,
                environment: currentEnvironment,
                filterNames: currentName ? [currentName] : undefined,
            });
        }
        if (existingVariables.length === 0) {
            throw new Error(`Variable with name ${currentName} ${currentEnvironment ? `in environment ${currentEnvironment.toLocaleLowerCase()}` : ''} does not exist ${suffix}.`);
        }
        else if (existingVariables.length > 1) {
            selectedVariable = await (0, prompts_1.selectAsync)('Select variable', existingVariables.map(variable => ({
                title: (0, variableUtils_1.formatVariableName)(variable),
                value: variable,
            })));
        }
        else {
            selectedVariable = existingVariables[0];
        }
        (0, assert_1.default)(selectedVariable, 'Variable must be selected');
        const { name: newName, value: newValue, environment: newEnvironments, visibility: newVisibility, type: newType, fileName, } = await this.promptForMissingFlagsAsync(selectedVariable, {
            name,
            value: rawValue,
            environment: environments,
            visibility,
            'non-interactive': nonInteractive,
            type,
            scope,
        }, { graphqlClient, projectId });
        const variable = await EnvironmentVariableMutation_1.EnvironmentVariableMutation.updateAsync(graphqlClient, {
            id: selectedVariable.id,
            name: newName,
            value: newValue,
            environments: newEnvironments,
            type: newType,
            visibility: newVisibility,
            fileName: newValue ? fileName : undefined,
        });
        if (!variable) {
            throw new Error(`Could not update variable with name ${name} ${suffix}`);
        }
        log_1.default.withTick(`Updated variable ${chalk_1.default.bold(selectedVariable.name)} ${suffix}.`);
    }
    sanitizeInputs(flags, { environment }) {
        if (flags['non-interactive']) {
            if (!flags['variable-name']) {
                throw new Error('Current name is required in non-interactive mode. Run the command with --variable-name flag.');
            }
            if (flags['type'] && !flags['value']) {
                throw new Error('Value is required when type is set. Run the command with --value flag.');
            }
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
    async promptForMissingFlagsAsync(selectedVariable, { name, value, environment: environments, visibility, 'non-interactive': nonInteractive, type, ...rest }, { graphqlClient, projectId }) {
        let newType;
        let newVisibility;
        let fileName;
        if (type === 'file') {
            newType = generated_1.EnvironmentSecretType.FileBase64;
        }
        else if (type === 'string') {
            newType = generated_1.EnvironmentSecretType.String;
        }
        if (!nonInteractive) {
            if (!name) {
                name = await (0, prompts_2.promptVariableNameAsync)(nonInteractive, selectedVariable.name);
                if (!name || name.length === 0) {
                    name = undefined;
                }
            }
            if (!type && !value && !nonInteractive) {
                newType = await (0, prompts_2.promptVariableTypeAsync)(nonInteractive, selectedVariable.type);
            }
            if (!value) {
                value = await (0, prompts_2.promptVariableValueAsync)({
                    nonInteractive,
                    required: false,
                    filePath: (newType ?? selectedVariable.type) === generated_1.EnvironmentSecretType.FileBase64,
                    initial: (newType ?? selectedVariable.type) === generated_1.EnvironmentSecretType.FileBase64
                        ? undefined
                        : selectedVariable.value,
                });
                if (!value || value.length === 0 || value === selectedVariable.value) {
                    value = undefined;
                    newType = undefined;
                }
            }
            if (!environments || environments.length === 0) {
                environments = await (0, prompts_2.promptVariableEnvironmentAsync)({
                    nonInteractive,
                    multiple: true,
                    canEnterCustomEnvironment: true,
                    selectedEnvironments: selectedVariable.environments ?? [],
                    graphqlClient,
                    projectId,
                });
                if (!environments ||
                    environments.length === 0 ||
                    environments === selectedVariable.environments) {
                    environments = undefined;
                }
            }
            if (!visibility) {
                newVisibility = await (0, prompts_2.promptVariableVisibilityAsync)(nonInteractive, selectedVariable.visibility);
                if (!newVisibility || newVisibility === selectedVariable.visibility) {
                    newVisibility = undefined;
                }
            }
        }
        // If value is provided but type is not explicitly set, preserve the existing type
        if (value && !newType) {
            newType = selectedVariable.type;
        }
        if (newType === generated_1.EnvironmentSecretType.FileBase64 && value) {
            const environmentFilePath = path_1.default.resolve(value);
            if (!(await fs_extra_1.default.pathExists(environmentFilePath))) {
                if (type === 'file') {
                    throw new Error(`File "${value}" does not exist`);
                }
                else {
                    throw new Error(`Variable "${selectedVariable.name}" is a file type, but "${value}" does not exist as a file. If you want to convert it to a string, pass --type string.`);
                }
            }
            fileName = path_1.default.basename(environmentFilePath);
            value = await fs_extra_1.default.readFile(environmentFilePath, 'base64');
        }
        if (visibility) {
            newVisibility = (0, prompts_2.parseVisibility)(visibility);
        }
        return {
            ...rest,
            name,
            value,
            environment: environments,
            visibility: newVisibility,
            'non-interactive': nonInteractive,
            type: newType,
            fileName,
        };
    }
}
exports.default = EnvUpdate;
