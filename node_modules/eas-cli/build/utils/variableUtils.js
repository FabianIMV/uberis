"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatVariableName = formatVariableName;
exports.formatVariableValue = formatVariableValue;
exports.performForEnvironmentsAsync = performForEnvironmentsAsync;
exports.formatVariable = formatVariable;
const tslib_1 = require("tslib");
const dateformat_1 = tslib_1.__importDefault(require("dateformat"));
const formatFields_1 = tslib_1.__importDefault(require("./formatFields"));
const generated_1 = require("../graphql/generated");
function formatVariableName(variable) {
    const name = variable.name;
    const scope = variable.scope === generated_1.EnvironmentVariableScope.Project ? 'project' : 'shared';
    const environments = variable.environments?.join(', ') ?? '';
    const updatedAt = variable.updatedAt ? new Date(variable.updatedAt).toLocaleString() : '';
    const type = variable.type === generated_1.EnvironmentSecretType.FileBase64 ? 'file' : 'string';
    const visibility = variable.visibility;
    return `${name} | ${scope} | ${type} | ${visibility} | ${environments} | Updated at: ${updatedAt}`;
}
function formatVariableValue(variable) {
    // TODO: Add Learn more link
    if (variable.value) {
        return variable.value;
    }
    if (variable.valueWithFileContent) {
        return atob(variable.valueWithFileContent);
    }
    if (variable.visibility === generated_1.EnvironmentVariableVisibility.Sensitive) {
        return '***** (This is a sensitive env variable. To access it, run command with --include-sensitive flag. Learn more.)';
    }
    if (variable.visibility === generated_1.EnvironmentVariableVisibility.Secret) {
        return "***** (This is a secret env variable that can only be accessed on EAS builder and can't be read in any UI. Learn more.)";
    }
    if (variable.type === generated_1.EnvironmentSecretType.FileBase64) {
        return '***** (This is a file env variable. To access it, run command with --include-file-content flag. Learn more.)';
    }
    return '*****';
}
async function performForEnvironmentsAsync(environments, fun) {
    const selectedEnvironments = environments ?? [undefined];
    return await Promise.all(selectedEnvironments.map(env => fun(env)));
}
function formatVariable(variable) {
    return (0, formatFields_1.default)([
        { label: 'ID', value: variable.id },
        { label: 'Name', value: variable.name },
        { label: 'Value', value: formatVariableValue(variable) },
        { label: 'Scope', value: variable.scope },
        { label: 'Visibility', value: variable.visibility ?? '' },
        {
            label: 'Environments',
            value: variable.environments ? variable.environments.join(', ') : '-',
        },
        {
            label: 'type',
            value: variable.type === generated_1.EnvironmentSecretType.FileBase64 ? 'file' : 'string',
        },
        { label: 'Created at', value: (0, dateformat_1.default)(variable.createdAt, 'mmm dd HH:MM:ss') },
        { label: 'Updated at', value: (0, dateformat_1.default)(variable.updatedAt, 'mmm dd HH:MM:ss') },
    ]);
}
