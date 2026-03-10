"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectEnvironmentVariableEnvironmentsAsync = getProjectEnvironmentVariableEnvironmentsAsync;
exports.promptVariableTypeAsync = promptVariableTypeAsync;
exports.parseVisibility = parseVisibility;
exports.promptVariableVisibilityAsync = promptVariableVisibilityAsync;
exports.promptVariableEnvironmentAsync = promptVariableEnvironmentAsync;
exports.promptVariableValueAsync = promptVariableValueAsync;
exports.promptVariableNameAsync = promptVariableNameAsync;
exports.promptPlatformAsync = promptPlatformAsync;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const environment_1 = require("../build/utils/environment");
const generated_1 = require("../graphql/generated");
const EnvironmentVariablesQuery_1 = require("../graphql/queries/EnvironmentVariablesQuery");
const platform_1 = require("../platform");
const prompts_1 = require("../prompts");
const DEFAULT_ENVIRONMENTS = Object.values(environment_1.DefaultEnvironment);
async function getProjectEnvironmentVariableEnvironmentsAsync(graphqlClient, projectId) {
    try {
        const environments = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.environmentVariableEnvironmentsAsync(graphqlClient, projectId);
        return environments;
    }
    catch {
        throw new Error('Failed to fetch available environments');
    }
}
const CUSTOM_ENVIRONMENT_VALUE = '~~CUSTOM~~';
async function promptVariableTypeAsync(nonInteractive, initialType) {
    if (nonInteractive) {
        throw new Error('The `--type` flag must be set when running in `--non-interactive` mode. Valid values: string, file.');
    }
    const options = [
        {
            title: 'String',
            value: generated_1.EnvironmentSecretType.String,
        },
        {
            title: 'File',
            value: generated_1.EnvironmentSecretType.FileBase64,
        },
    ];
    return await (0, prompts_1.selectAsync)('Select the type of variable', options, {
        initial: initialType,
    });
}
function parseVisibility(stringVisibility) {
    switch (stringVisibility) {
        case 'plaintext':
            return generated_1.EnvironmentVariableVisibility.Public;
        case 'sensitive':
            return generated_1.EnvironmentVariableVisibility.Sensitive;
        case 'secret':
            return generated_1.EnvironmentVariableVisibility.Secret;
        default:
            throw new Error(`Invalid visibility: ${stringVisibility}`);
    }
}
async function promptCustomEnvironmentAsync() {
    const { customEnvironment } = await (0, prompts_1.promptAsync)({
        type: 'text',
        name: 'customEnvironment',
        message: 'Enter custom environment name:',
        validate: (value) => {
            if (!value || value.trim() === '') {
                return 'Environment name cannot be empty';
            }
            if (!value.match(/^[a-zA-Z0-9_-]+$/)) {
                return 'Environment name may only contain letters, numbers, underscores, and hyphens';
            }
            return true;
        },
    });
    return customEnvironment;
}
async function promptVariableVisibilityAsync(nonInteractive, selectedVisibility) {
    if (nonInteractive) {
        throw new Error('The `--visibility` flag must be set when running in `--non-interactive` mode. Valid values: plaintext, sensitive, secret.');
    }
    return await (0, prompts_1.selectAsync)('Select visibility:', [
        {
            title: 'Plain text',
            value: generated_1.EnvironmentVariableVisibility.Public,
            selected: selectedVisibility === generated_1.EnvironmentVariableVisibility.Public,
        },
        {
            title: 'Sensitive',
            value: generated_1.EnvironmentVariableVisibility.Sensitive,
            selected: selectedVisibility === generated_1.EnvironmentVariableVisibility.Sensitive,
        },
        {
            title: 'Secret',
            value: generated_1.EnvironmentVariableVisibility.Secret,
            selected: selectedVisibility === generated_1.EnvironmentVariableVisibility.Secret,
        },
    ]);
}
async function promptVariableEnvironmentAsync({ nonInteractive, selectedEnvironments, multiple = false, canEnterCustomEnvironment = false, graphqlClient, projectId, }) {
    if (nonInteractive) {
        throw new Error(`The \`--environment\` flag must be set when running in \`--non-interactive\` mode. Default environments: ${DEFAULT_ENVIRONMENTS.join(', ')}.`);
    }
    let allEnvironments = DEFAULT_ENVIRONMENTS;
    if (graphqlClient && projectId) {
        const projectEnvironments = await getProjectEnvironmentVariableEnvironmentsAsync(graphqlClient, projectId);
        allEnvironments = [...new Set([...DEFAULT_ENVIRONMENTS, ...projectEnvironments])];
    }
    if (!multiple) {
        const choices = allEnvironments.map(environment => ({
            title: environment,
            value: environment,
        }));
        if (canEnterCustomEnvironment) {
            choices.push({
                title: 'Other (enter custom environment)',
                value: CUSTOM_ENVIRONMENT_VALUE,
            });
        }
        const selectedEnvironment = await (0, prompts_1.selectAsync)('Select environment:', choices);
        if (selectedEnvironment === CUSTOM_ENVIRONMENT_VALUE) {
            return await promptCustomEnvironmentAsync();
        }
        return selectedEnvironment;
    }
    const choices = allEnvironments.map(environment => ({
        title: environment,
        value: environment,
        selected: selectedEnvironments?.includes(environment),
    }));
    if (canEnterCustomEnvironment) {
        choices.push({
            title: 'Other (enter custom environment)',
            value: CUSTOM_ENVIRONMENT_VALUE,
            selected: false,
        });
    }
    const { environments } = await (0, prompts_1.promptAsync)({
        message: 'Select environment:',
        name: 'environments',
        type: 'multiselect',
        choices,
    });
    if (environments?.includes(CUSTOM_ENVIRONMENT_VALUE)) {
        const customEnvironment = await promptCustomEnvironmentAsync();
        const filteredEnvironments = environments.filter((env) => env !== CUSTOM_ENVIRONMENT_VALUE);
        return [...filteredEnvironments, customEnvironment];
    }
    return environments;
}
async function promptVariableValueAsync({ nonInteractive, required = true, hidden = false, filePath = false, initial, }) {
    if (nonInteractive && required) {
        throw new Error(`Environment variable needs 'value' to be specified when running in non-interactive mode. Run the command with ${chalk_1.default.bold('--value VARIABLE_VALUE')} flag to fix the issue`);
    }
    const { variableValue } = await (0, prompts_1.promptAsync)({
        type: hidden && !filePath ? 'password' : 'text',
        name: 'variableValue',
        message: filePath ? 'File path:' : 'Variable value:',
        initial: initial ?? '',
        validate: variableValue => {
            if (!required) {
                return true;
            }
            if (!variableValue || variableValue.trim() === '') {
                return "Environment variable value can't be empty";
            }
            return true;
        },
    });
    if (!variableValue && required) {
        throw new Error(`Environment variable needs 'value' to be specifed. Run the command again  with ${chalk_1.default.bold('--value VARIABLE_VALUE')} flag or provide it interactively to fix the issue.`);
    }
    return variableValue;
}
async function promptVariableNameAsync(nonInteractive, initialValue) {
    const validationMessage = 'Variable name may not be empty.';
    if (nonInteractive) {
        throw new Error(validationMessage);
    }
    const { name } = await (0, prompts_1.promptAsync)({
        type: 'text',
        name: 'name',
        message: `Variable name:`,
        initial: initialValue,
        validate: value => {
            if (!value) {
                return validationMessage;
            }
            if (!value.match(/^\w+$/)) {
                return 'Names may contain only letters, numbers, and underscores.';
            }
            return true;
        },
    });
    if (!name) {
        throw new Error(validationMessage);
    }
    return name;
}
async function promptPlatformAsync({ message, }) {
    const { platform } = await (0, prompts_1.promptAsync)({
        type: 'select',
        message,
        name: 'platform',
        choices: [
            {
                title: 'All',
                value: platform_1.RequestedPlatform.All,
            },
            {
                title: 'iOS',
                value: platform_1.RequestedPlatform.Ios,
            },
            {
                title: 'Android',
                value: platform_1.RequestedPlatform.Android,
            },
        ],
    });
    return platform;
}
