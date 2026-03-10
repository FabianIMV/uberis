"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildStepOutput = void 0;
exports.makeBuildStepOutputByIdMap = makeBuildStepOutputByIdMap;
const errors_1 = require("./errors");
class BuildStepOutput {
    ctx;
    id;
    stepDisplayName;
    required;
    _value;
    static createProvider(params) {
        return (ctx, stepDisplayName) => new BuildStepOutput(ctx, { ...params, stepDisplayName });
    }
    constructor(ctx, { id, stepDisplayName, required }) {
        this.ctx = ctx;
        this.id = id;
        this.stepDisplayName = stepDisplayName;
        this.required = required;
    }
    get rawValue() {
        return this._value;
    }
    get value() {
        if (this.required && this._value === undefined) {
            throw new errors_1.BuildStepRuntimeError(`Output parameter "${this.id}" for step "${this.stepDisplayName}" is required but it was not set.`);
        }
        return this._value;
    }
    set(value) {
        if (this.required && value === undefined) {
            throw new errors_1.BuildStepRuntimeError(`Output parameter "${this.id}" for step "${this.stepDisplayName}" is required.`);
        }
        this._value = value;
        return this;
    }
    serialize() {
        return {
            id: this.id,
            stepDisplayName: this.stepDisplayName,
            required: this.required,
            value: this._value,
        };
    }
    static deserialize(serialized) {
        const deserialized = new BuildStepOutput(undefined, {
            id: serialized.id,
            stepDisplayName: serialized.stepDisplayName,
            required: serialized.required,
        });
        deserialized._value = serialized.value;
        return deserialized;
    }
}
exports.BuildStepOutput = BuildStepOutput;
function makeBuildStepOutputByIdMap(outputs) {
    if (outputs === undefined) {
        return {};
    }
    return outputs.reduce((acc, output) => {
        acc[output.id] = output;
        return acc;
    }, {});
}
