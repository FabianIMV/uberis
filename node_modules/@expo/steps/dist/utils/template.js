"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILD_STEP_OR_BUILD_GLOBAL_CONTEXT_REFERENCE_REGEX = exports.BUILD_GLOBAL_CONTEXT_EXPRESSION_REGEXP = exports.BUILD_STEP_OUTPUT_EXPRESSION_REGEXP = exports.BUILD_STEP_INPUT_EXPRESSION_REGEXP = void 0;
exports.interpolateWithInputs = interpolateWithInputs;
exports.interpolateWithOutputs = interpolateWithOutputs;
exports.interpolateStringWithOutputs = interpolateStringWithOutputs;
exports.interpolateObjectWithOutputs = interpolateObjectWithOutputs;
exports.getObjectValueForInterpolation = getObjectValueForInterpolation;
exports.interpolateWithGlobalContext = interpolateWithGlobalContext;
exports.interpolateStringWithGlobalContext = interpolateStringWithGlobalContext;
exports.interpolateObjectWithGlobalContext = interpolateObjectWithGlobalContext;
exports.findOutputPaths = findOutputPaths;
exports.parseOutputPath = parseOutputPath;
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
const lodash_get_1 = __importDefault(require("lodash.get"));
const nullthrows_1 = require("./nullthrows");
const BuildStepInput_1 = require("../BuildStepInput");
const errors_1 = require("../errors");
exports.BUILD_STEP_INPUT_EXPRESSION_REGEXP = /\${\s*(inputs\.[\S]+)\s*}/;
exports.BUILD_STEP_OUTPUT_EXPRESSION_REGEXP = /\${\s*(steps\.[\S]+)\s*}/;
exports.BUILD_GLOBAL_CONTEXT_EXPRESSION_REGEXP = /\${\s*(eas\.[\S]+)\s*}/;
exports.BUILD_STEP_OR_BUILD_GLOBAL_CONTEXT_REFERENCE_REGEX = /\${\s*((steps|eas)\.[\S]+)\s*}/;
function interpolateWithInputs(templateString, inputs) {
    return interpolate(templateString, exports.BUILD_STEP_INPUT_EXPRESSION_REGEXP, inputs);
}
function interpolateWithOutputs(interpolableValue, fn) {
    if (typeof interpolableValue === 'string') {
        return interpolateStringWithOutputs(interpolableValue, fn);
    }
    else {
        return interpolateObjectWithOutputs(interpolableValue, fn);
    }
}
function interpolateStringWithOutputs(templateString, fn) {
    return interpolate(templateString, exports.BUILD_STEP_OUTPUT_EXPRESSION_REGEXP, fn);
}
function interpolateObjectWithOutputs(interpolableObject, fn) {
    const interpolableObjectCopy = (0, lodash_clonedeep_1.default)(interpolableObject);
    Object.keys(interpolableObject).forEach(property => {
        const propertyValue = interpolableObject[property];
        if (['string', 'object'].includes(typeof propertyValue)) {
            interpolableObjectCopy[property] =
                interpolateWithOutputs(propertyValue, fn);
        }
    });
    return interpolableObjectCopy;
}
function getObjectValueForInterpolation(path, obj) {
    const value = (0, lodash_get_1.default)(obj, path);
    if (value === undefined) {
        throw new errors_1.BuildStepRuntimeError(`Object field "${path}" does not exist. Ensure you are using the correct field name.`);
    }
    if (!isAllowedValueTypeForObjectInterpolation(value)) {
        throw new errors_1.BuildStepRuntimeError(`EAS context field "${path}" is not of type ${Object.values(BuildStepInput_1.BuildStepInputValueTypeName).join(', ')}, or undefined. It is of type "${typeof value}". We currently only support accessing string or undefined values from the EAS context.`);
    }
    if (value !== null && typeof value === 'object') {
        return JSON.stringify(value);
    }
    return value;
}
function interpolateWithGlobalContext(interpolableValue, fn) {
    if (typeof interpolableValue === 'string') {
        return interpolateStringWithGlobalContext(interpolableValue, fn);
    }
    else {
        return interpolateObjectWithGlobalContext(interpolableValue, fn);
    }
}
function interpolateStringWithGlobalContext(templateString, fn) {
    return interpolate(templateString, exports.BUILD_GLOBAL_CONTEXT_EXPRESSION_REGEXP, fn);
}
function interpolateObjectWithGlobalContext(templateObject, fn) {
    const templateObjectCopy = (0, lodash_clonedeep_1.default)(templateObject);
    Object.keys(templateObject).forEach(property => {
        const propertyValue = templateObject[property];
        if (['string', 'object'].includes(typeof propertyValue)) {
            templateObjectCopy[property] =
                interpolateWithGlobalContext(propertyValue, fn);
        }
    });
    return templateObjectCopy;
}
function interpolate(templateString, regex, varsOrFn) {
    const matched = templateString.match(new RegExp(regex, 'g'));
    if (!matched) {
        return templateString;
    }
    let result = templateString;
    for (const match of matched) {
        const [, path] = (0, nullthrows_1.nullthrows)(match.match(regex));
        const value = typeof varsOrFn === 'function' ? varsOrFn(path) : varsOrFn[path.split('.')[1]];
        result = result.replace(match, value);
    }
    return result;
}
function isAllowedValueTypeForObjectInterpolation(value) {
    return (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'object' ||
        value === null);
}
function findOutputPaths(templateString) {
    const result = [];
    const matches = templateString.matchAll(new RegExp(exports.BUILD_STEP_OUTPUT_EXPRESSION_REGEXP, 'g'));
    for (const match of matches) {
        result.push(parseOutputPath(match[1]));
    }
    return result;
}
function parseOutputPath(outputPathWithObjectName) {
    const splits = outputPathWithObjectName.split('.').slice(1);
    if (splits.length !== 2) {
        throw new errors_1.BuildConfigError(`Step output path must consist of two components joined with a dot, where first is the step ID, and second is the output name, e.g. "step3.output1". Passed: "${outputPathWithObjectName}"`);
    }
    const [stepId, outputId] = splits;
    return { stepId, outputId };
}
