"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowDispatchInputZ = void 0;
exports.parseInputs = parseInputs;
exports.parseJsonInputs = parseJsonInputs;
exports.parseWorkflowInputsFromYaml = parseWorkflowInputsFromYaml;
exports.maybePromptForMissingInputsAsync = maybePromptForMissingInputsAsync;
const tslib_1 = require("tslib");
const zod_1 = require("zod");
const environment_1 = require("../../build/utils/environment");
const types_1 = require("../../credentials/ios/types");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const parse_1 = require("./parse");
const inputExtraProperties = {
    description: types_1.stringLike.optional().describe('Description of the input'),
    required: types_1.booleanLike.default(false).optional().describe('Whether the input is required.'),
};
// Adapted from the input definition on the server (https://github.com/expo/universe/pull/21950)
exports.WorkflowDispatchInputZ = zod_1.z.discriminatedUnion('type', [
    zod_1.z.object({
        ...inputExtraProperties,
        type: zod_1.z.literal('string').default('string').optional(),
        default: types_1.stringLike.optional().describe('Default value for the input'),
    }),
    zod_1.z.object({
        ...inputExtraProperties,
        type: zod_1.z.literal('boolean'),
        default: types_1.booleanLike.optional().describe('Default value for the input'),
    }),
    zod_1.z.object({
        ...inputExtraProperties,
        type: zod_1.z.literal('number'),
        default: zod_1.z.number().optional().describe('Default value for the input'),
    }),
    zod_1.z.object({
        ...inputExtraProperties,
        type: zod_1.z.literal('choice'),
        default: types_1.stringLike.optional().describe('Default value for the input'),
        options: zod_1.z.array(types_1.stringLike).min(1).describe('Options for choice type inputs'),
    }),
    zod_1.z.object({
        ...inputExtraProperties,
        type: zod_1.z.literal('environment'),
        default: zod_1.z
            .enum(Object.values(environment_1.DefaultEnvironment))
            .optional()
            .describe('Default value for the input'),
    }),
]);
function parseInputs(inputFlags) {
    const inputs = {};
    for (const inputFlag of inputFlags) {
        const equalIndex = inputFlag.indexOf('=');
        if (equalIndex === -1) {
            throw new Error(`Invalid input format: ${inputFlag}. Expected key=value format.`);
        }
        const key = inputFlag.substring(0, equalIndex);
        const value = inputFlag.substring(equalIndex + 1);
        if (!key) {
            throw new Error(`Invalid input format: ${inputFlag}. Key cannot be empty.`);
        }
        inputs[key] = value;
    }
    return inputs;
}
function parseJsonInputs(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            throw new Error('JSON input must be an object.');
        }
        return parsed;
    }
    catch (error) {
        throw new Error(`Invalid JSON input.`, { cause: error });
    }
}
function parseWorkflowInputsFromYaml(yamlConfig) {
    try {
        const parsed = (0, parse_1.parsedYamlFromWorkflowContents)({ yamlConfig });
        return zod_1.z
            .record(zod_1.z.string(), exports.WorkflowDispatchInputZ)
            .default({})
            .parse(parsed?.on?.workflow_dispatch?.inputs);
    }
    catch (error) {
        log_1.default.warn('Failed to parse workflow inputs from YAML:', error);
        return {};
    }
}
async function maybePromptForMissingInputsAsync({ inputSpecs, inputs, }) {
    const requiredInputs = Object.entries(inputSpecs).filter(([_, spec]) => spec.required);
    const missingRequiredInputs = requiredInputs.filter(([key]) => inputs[key] === undefined);
    if (missingRequiredInputs.length === 0) {
        return inputs;
    }
    log_1.default.addNewLineIfNone();
    log_1.default.log('Some required inputs are missing. Please provide them:');
    const nextInputs = { ...inputs };
    for (const [key, spec] of missingRequiredInputs) {
        const value = await promptForMissingInputAsync({ key, spec });
        nextInputs[key] = value;
    }
    return nextInputs;
}
async function promptForMissingInputAsync({ key, spec, }) {
    const message = spec.description ? `${key} (${spec.description})` : key;
    switch (spec.type) {
        case 'boolean': {
            const { value } = await (0, prompts_1.promptAsync)({
                type: 'confirm',
                name: 'value',
                message,
                initial: spec.default,
            });
            return value;
        }
        case 'number': {
            const { value } = await (0, prompts_1.promptAsync)({
                type: 'number',
                name: 'value',
                message,
                initial: spec.default,
                validate: (val) => {
                    if (isNaN(val)) {
                        return 'Please enter a valid number';
                    }
                    return true;
                },
            });
            return value;
        }
        case 'choice': {
            const { value } = await (0, prompts_1.promptAsync)({
                type: 'select',
                name: 'value',
                message,
                choices: spec.options.map(option => ({
                    title: option,
                    value: option,
                })),
                initial: spec.default,
            });
            return value;
        }
        case 'string':
        case 'environment':
        default: {
            const { value } = await (0, prompts_1.promptAsync)({
                type: 'text',
                name: 'value',
                message,
                initial: spec.default,
                validate: (val) => {
                    if (spec.required && (!val || val.trim() === '')) {
                        return 'This field is required';
                    }
                    return true;
                },
            });
            return value;
        }
    }
}
