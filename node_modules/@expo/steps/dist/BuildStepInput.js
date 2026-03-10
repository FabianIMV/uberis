"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildStepInput = exports.BuildStepInputValueTypeName = void 0;
exports.makeBuildStepInputByIdMap = makeBuildStepInputByIdMap;
const assert_1 = __importDefault(require("assert"));
const errors_1 = require("./errors");
const interpolation_1 = require("./interpolation");
const template_1 = require("./utils/template");
var BuildStepInputValueTypeName;
(function (BuildStepInputValueTypeName) {
    BuildStepInputValueTypeName["STRING"] = "string";
    BuildStepInputValueTypeName["BOOLEAN"] = "boolean";
    BuildStepInputValueTypeName["NUMBER"] = "number";
    BuildStepInputValueTypeName["JSON"] = "json";
})(BuildStepInputValueTypeName || (exports.BuildStepInputValueTypeName = BuildStepInputValueTypeName = {}));
class BuildStepInput {
    ctx;
    id;
    stepDisplayName;
    defaultValue;
    allowedValues;
    allowedValueTypeName;
    required;
    _value;
    static createProvider(params) {
        return (ctx, stepDisplayName) => new BuildStepInput(ctx, { ...params, stepDisplayName });
    }
    constructor(ctx, { id, stepDisplayName, allowedValues, defaultValue, required, allowedValueTypeName, }) {
        this.ctx = ctx;
        this.id = id;
        this.stepDisplayName = stepDisplayName;
        this.allowedValues = allowedValues;
        this.defaultValue = defaultValue;
        this.required = required;
        this.allowedValueTypeName = allowedValueTypeName;
    }
    getValue({ interpolationContext, }) {
        const rawValue = this._value ?? this.defaultValue;
        if (this.required && rawValue === undefined) {
            throw new errors_1.BuildStepRuntimeError(`Input parameter "${this.id}" for step "${this.stepDisplayName}" is required but it was not set.`);
        }
        const interpolatedValue = (0, interpolation_1.interpolateJobContext)({
            target: rawValue,
            context: interpolationContext,
        });
        const valueDoesNotRequireInterpolation = interpolatedValue === undefined ||
            interpolatedValue === null ||
            typeof interpolatedValue === 'boolean' ||
            typeof interpolatedValue === 'number';
        let returnValue;
        if (valueDoesNotRequireInterpolation) {
            if (typeof interpolatedValue !== this.allowedValueTypeName &&
                interpolatedValue !== undefined) {
                throw new errors_1.BuildStepRuntimeError(`Input parameter "${this.id}" for step "${this.stepDisplayName}" must be of type "${this.allowedValueTypeName}".`);
            }
            returnValue = interpolatedValue;
        }
        else {
            // `valueDoesNotRequireInterpolation` checks that `rawValue` is not undefined
            // so this will never be true.
            (0, assert_1.default)(interpolatedValue !== undefined);
            const valueInterpolatedWithGlobalContext = this.ctx.interpolate(interpolatedValue);
            const valueInterpolatedWithOutputsAndGlobalContext = (0, template_1.interpolateWithOutputs)(valueInterpolatedWithGlobalContext, path => this.ctx.getStepOutputValue(path) ?? '');
            returnValue = this.parseInputValueToAllowedType(valueInterpolatedWithOutputsAndGlobalContext);
        }
        return returnValue;
    }
    get rawValue() {
        return this._value ?? this.defaultValue;
    }
    set(value) {
        if (this.required && value === undefined) {
            throw new errors_1.BuildStepRuntimeError(`Input parameter "${this.id}" for step "${this.stepDisplayName}" is required.`);
        }
        this._value = value;
        return this;
    }
    isRawValueOneOfAllowedValues() {
        const value = this._value ?? this.defaultValue;
        if (this.allowedValues === undefined || value === undefined) {
            return true;
        }
        return this.allowedValues.includes(value);
    }
    isRawValueStepOrContextReference() {
        return (typeof this.rawValue === 'string' &&
            (!!template_1.BUILD_STEP_OR_BUILD_GLOBAL_CONTEXT_REFERENCE_REGEX.exec(this.rawValue) ||
                // If value is an interpolation reference we're going to render whatever it evaluates to.
                // See `interpolateJobContext`.
                (this.rawValue.startsWith('${{') && this.rawValue.endsWith('}}'))));
    }
    parseInputValueToAllowedType(value) {
        if (typeof value === 'object') {
            return value;
        }
        if (this.allowedValueTypeName === BuildStepInputValueTypeName.STRING) {
            return this.parseInputValueToString(value);
        }
        else if (this.allowedValueTypeName === BuildStepInputValueTypeName.NUMBER) {
            return this.parseInputValueToNumber(value);
        }
        else if (this.allowedValueTypeName === BuildStepInputValueTypeName.BOOLEAN) {
            return this.parseInputValueToBoolean(value);
        }
        else {
            return this.parseInputValueToObject(value);
        }
    }
    parseInputValueToString(value) {
        let parsedValue = value;
        try {
            parsedValue = JSON.parse(`"${value}"`);
        }
        catch (err) {
            if (!(err instanceof SyntaxError)) {
                throw err;
            }
        }
        return parsedValue;
    }
    parseInputValueToNumber(value) {
        const numberValue = Number(value);
        if (Number.isNaN(numberValue)) {
            throw new errors_1.BuildStepRuntimeError(`Input parameter "${this.id}" for step "${this.stepDisplayName}" must be of type "${this.allowedValueTypeName}".`);
        }
        return numberValue;
    }
    parseInputValueToBoolean(value) {
        if (value === 'true' || value === true) {
            return true;
        }
        else if (value === 'false' || value === false) {
            return false;
        }
        else {
            throw new errors_1.BuildStepRuntimeError(`Input parameter "${this.id}" for step "${this.stepDisplayName}" must be of type "${this.allowedValueTypeName}".`);
        }
    }
    parseInputValueToObject(value) {
        try {
            return JSON.parse(value);
        }
        catch (e) {
            throw new errors_1.BuildStepRuntimeError(`Input parameter "${this.id}" for step "${this.stepDisplayName}" must be of type "${this.allowedValueTypeName}".`, {
                cause: e,
            });
        }
    }
}
exports.BuildStepInput = BuildStepInput;
function makeBuildStepInputByIdMap(inputs) {
    if (inputs === undefined) {
        return {};
    }
    return inputs.reduce((acc, input) => {
        acc[input.id] = input;
        return acc;
    }, {});
}
