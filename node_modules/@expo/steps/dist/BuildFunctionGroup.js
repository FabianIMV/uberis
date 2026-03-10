"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildFunctionGroup = void 0;
exports.createBuildFunctionGroupByIdMapping = createBuildFunctionGroupByIdMapping;
const BuildStepInput_1 = require("./BuildStepInput");
const errors_1 = require("./errors");
class BuildFunctionGroup {
    namespace;
    id;
    inputProviders;
    createBuildStepsFromFunctionGroupCall;
    constructor({ namespace, id, inputProviders, createBuildStepsFromFunctionGroupCall, }) {
        this.namespace = namespace;
        this.id = id;
        this.inputProviders = inputProviders;
        this.createBuildStepsFromFunctionGroupCall = (ctx, { callInputs = {} } = {}) => {
            const inputs = this.inputProviders?.map(inputProvider => {
                const input = inputProvider(ctx, id);
                if (input.id in callInputs) {
                    input.set(callInputs[input.id]);
                }
                return input;
            });
            return createBuildStepsFromFunctionGroupCall(ctx, {
                inputs: (0, BuildStepInput_1.makeBuildStepInputByIdMap)(inputs),
            });
        };
    }
    getFullId() {
        return this.namespace === undefined ? this.id : `${this.namespace}/${this.id}`;
    }
}
exports.BuildFunctionGroup = BuildFunctionGroup;
function createBuildFunctionGroupByIdMapping(buildFunctionGroups) {
    const buildFunctionGroupById = {};
    for (const buildFunctionGroup of buildFunctionGroups) {
        if (buildFunctionGroupById[buildFunctionGroup.getFullId()] !== undefined) {
            throw new errors_1.BuildConfigError(`Build function group with id ${buildFunctionGroup.getFullId()} is already defined.`);
        }
        buildFunctionGroupById[buildFunctionGroup.getFullId()] = buildFunctionGroup;
    }
    return buildFunctionGroupById;
}
