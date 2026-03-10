import { BuildWorkflow } from './BuildWorkflow';
export declare class BuildWorkflowValidator {
    private readonly workflow;
    constructor(workflow: BuildWorkflow);
    validateAsync(): Promise<void>;
    private validateUniqueStepIds;
    private validateInputs;
    private validateAllowedPlatforms;
    private validateCustomFunctionModulesAsync;
}
