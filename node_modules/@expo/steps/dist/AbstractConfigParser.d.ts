import { BuildFunction, BuildFunctionById } from './BuildFunction';
import { BuildFunctionGroup } from './BuildFunctionGroup';
import { BuildStep } from './BuildStep';
import { BuildStepGlobalContext } from './BuildStepContext';
import { BuildWorkflow } from './BuildWorkflow';
export declare abstract class AbstractConfigParser {
    protected readonly ctx: BuildStepGlobalContext;
    protected readonly externalFunctions?: BuildFunction[];
    protected readonly externalFunctionGroups?: BuildFunctionGroup[];
    constructor(ctx: BuildStepGlobalContext, { externalFunctions, externalFunctionGroups, }: {
        externalFunctions?: BuildFunction[];
        externalFunctionGroups?: BuildFunctionGroup[];
    });
    parseAsync(): Promise<BuildWorkflow>;
    protected abstract parseConfigToBuildStepsAndBuildFunctionByIdMappingAsync(): Promise<{
        buildSteps: BuildStep[];
        buildFunctionById: BuildFunctionById;
    }>;
    private validateExternalFunctions;
    private validateExternalFunctionGroups;
    protected getExternalFunctionFullIds(): string[];
    protected getExternalFunctionGroupFullIds(): string[];
}
