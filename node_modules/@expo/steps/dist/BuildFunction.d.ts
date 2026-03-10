import { BuildRuntimePlatform } from './BuildRuntimePlatform';
import { BuildStep, BuildStepFunction } from './BuildStep';
import { BuildStepGlobalContext } from './BuildStepContext';
import { BuildStepEnv } from './BuildStepEnv';
import { BuildStepInputProvider } from './BuildStepInput';
import { BuildStepOutputProvider } from './BuildStepOutput';
export type BuildFunctionById = Record<string, BuildFunction>;
export type BuildFunctionCallInputs = Record<string, unknown>;
export declare class BuildFunction {
    readonly namespace?: string;
    readonly id: string;
    readonly name?: string;
    readonly supportedRuntimePlatforms?: BuildRuntimePlatform[];
    readonly inputProviders?: BuildStepInputProvider[];
    readonly outputProviders?: BuildStepOutputProvider[];
    readonly command?: string;
    readonly customFunctionModulePath?: string;
    readonly fn?: BuildStepFunction;
    readonly shell?: string;
    readonly __metricsId?: string;
    constructor({ namespace, id, name, supportedRuntimePlatforms, inputProviders, outputProviders, command, fn, customFunctionModulePath, shell, __metricsId, }: {
        namespace?: string;
        id: string;
        name?: string;
        supportedRuntimePlatforms?: BuildRuntimePlatform[];
        inputProviders?: BuildStepInputProvider[];
        outputProviders?: BuildStepOutputProvider[];
        command?: string;
        customFunctionModulePath?: string;
        fn?: BuildStepFunction;
        shell?: string;
        __metricsId?: string;
    });
    getFullId(): string;
    createBuildStepFromFunctionCall(ctx: BuildStepGlobalContext, { id, name, callInputs, workingDirectory, shell, env, ifCondition, timeoutMs, }?: {
        id?: string;
        name?: string;
        callInputs?: BuildFunctionCallInputs;
        workingDirectory?: string;
        shell?: string;
        env?: BuildStepEnv;
        ifCondition?: string;
        timeoutMs?: number;
    }): BuildStep;
}
