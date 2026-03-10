"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractConfigParser = void 0;
const BuildWorkflow_1 = require("./BuildWorkflow");
const BuildWorkflowValidator_1 = require("./BuildWorkflowValidator");
const errors_1 = require("./errors");
const duplicates_1 = require("./utils/expodash/duplicates");
const uniq_1 = require("./utils/expodash/uniq");
class AbstractConfigParser {
    ctx;
    externalFunctions;
    externalFunctionGroups;
    constructor(ctx, { externalFunctions, externalFunctionGroups, }) {
        this.ctx = ctx;
        this.validateExternalFunctions(externalFunctions);
        this.validateExternalFunctionGroups(externalFunctionGroups);
        this.externalFunctions = externalFunctions;
        this.externalFunctionGroups = externalFunctionGroups;
    }
    async parseAsync() {
        const { buildSteps, buildFunctionById } = await this.parseConfigToBuildStepsAndBuildFunctionByIdMappingAsync();
        const workflow = new BuildWorkflow_1.BuildWorkflow(this.ctx, { buildSteps, buildFunctions: buildFunctionById });
        await new BuildWorkflowValidator_1.BuildWorkflowValidator(workflow).validateAsync();
        return workflow;
    }
    validateExternalFunctions(externalFunctions) {
        if (externalFunctions === undefined) {
            return;
        }
        const externalFunctionIds = externalFunctions.map(f => f.getFullId());
        const duplicatedExternalFunctionIds = (0, duplicates_1.duplicates)(externalFunctionIds);
        if (duplicatedExternalFunctionIds.length === 0) {
            return;
        }
        throw new errors_1.BuildConfigError(`Provided external functions with duplicated IDs: ${duplicatedExternalFunctionIds
            .map(id => `"${id}"`)
            .join(', ')}`);
    }
    validateExternalFunctionGroups(externalFunctionGroups) {
        if (externalFunctionGroups === undefined) {
            return;
        }
        const externalFunctionGroupIds = externalFunctionGroups.map(f => f.getFullId());
        const duplicatedExternalFunctionGroupIds = (0, duplicates_1.duplicates)(externalFunctionGroupIds);
        if (duplicatedExternalFunctionGroupIds.length === 0) {
            return;
        }
        throw new errors_1.BuildConfigError(`Provided external function groups with duplicated IDs: ${duplicatedExternalFunctionGroupIds
            .map(id => `"${id}"`)
            .join(', ')}`);
    }
    getExternalFunctionFullIds() {
        if (this.externalFunctions === undefined) {
            return [];
        }
        const ids = this.externalFunctions.map(f => f.getFullId());
        return (0, uniq_1.uniq)(ids);
    }
    getExternalFunctionGroupFullIds() {
        if (this.externalFunctionGroups === undefined) {
            return [];
        }
        const ids = this.externalFunctionGroups.map(f => f.getFullId());
        return (0, uniq_1.uniq)(ids);
    }
}
exports.AbstractConfigParser = AbstractConfigParser;
