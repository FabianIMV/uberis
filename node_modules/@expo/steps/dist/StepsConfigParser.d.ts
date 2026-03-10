import { Step } from '@expo/eas-build-job';
import { AbstractConfigParser } from './AbstractConfigParser';
import { BuildFunction, BuildFunctionById } from './BuildFunction';
import { BuildFunctionGroup } from './BuildFunctionGroup';
import { BuildStep } from './BuildStep';
import { BuildStepGlobalContext } from './BuildStepContext';
export declare class StepsConfigParser extends AbstractConfigParser {
    private readonly steps;
    constructor(ctx: BuildStepGlobalContext, { steps, externalFunctions, externalFunctionGroups, }: {
        steps: Step[];
        externalFunctions?: BuildFunction[];
        externalFunctionGroups?: BuildFunctionGroup[];
    });
    protected parseConfigToBuildStepsAndBuildFunctionByIdMappingAsync(): Promise<{
        buildSteps: BuildStep[];
        buildFunctionById: BuildFunctionById;
    }>;
    private createBuildFunctionByIdMappingForExternalFunctions;
    private createBuildStepsFromStepConfig;
    private createBuildStepFromShellStepConfig;
    private createBuildStepsFromFunctionStepConfig;
    private createBuildStepOutputsFromDefinition;
    private static validateAllFunctionsExist;
}
