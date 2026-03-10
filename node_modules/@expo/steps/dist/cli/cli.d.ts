import { StaticJobInterpolationContext } from '@expo/eas-build-job';
import { bunyan } from '@expo/logger';
import { BuildRuntimePlatform } from '../BuildRuntimePlatform';
import { ExternalBuildContextProvider } from '../BuildStepContext';
import { BuildStepEnv } from '../BuildStepEnv';
export declare class CliContextProvider implements ExternalBuildContextProvider {
    readonly logger: bunyan;
    readonly runtimePlatform: BuildRuntimePlatform;
    readonly projectSourceDirectory: string;
    readonly projectTargetDirectory: string;
    readonly defaultWorkingDirectory: string;
    readonly buildLogsDirectory: string;
    private _env;
    constructor(logger: bunyan, runtimePlatform: BuildRuntimePlatform, projectSourceDirectory: string, projectTargetDirectory: string, defaultWorkingDirectory: string, buildLogsDirectory: string);
    get env(): BuildStepEnv;
    staticContext(): Omit<StaticJobInterpolationContext, 'steps'>;
    updateEnv(env: BuildStepEnv): void;
}
