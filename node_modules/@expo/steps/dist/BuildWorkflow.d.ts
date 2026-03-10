import { BuildFunctionById } from './BuildFunction';
import { BuildStep } from './BuildStep';
import { BuildStepGlobalContext } from './BuildStepContext';
export declare class BuildWorkflow {
    private readonly ctx;
    readonly buildSteps: BuildStep[];
    readonly buildFunctions: BuildFunctionById;
    constructor(ctx: BuildStepGlobalContext, { buildSteps, buildFunctions }: {
        buildSteps: BuildStep[];
        buildFunctions: BuildFunctionById;
    });
    executeAsync(): Promise<void>;
    private collectStepMetrics;
}
