import { BuildStepGlobalContext } from './BuildStepContext';
export declare function saveScriptToTemporaryFileAsync(ctx: BuildStepGlobalContext, stepId: string, scriptContents: string): Promise<string>;
export declare function cleanUpStepTemporaryDirectoriesAsync(ctx: BuildStepGlobalContext, stepId: string): Promise<void>;
export declare function getTemporaryOutputsDirPath(ctx: BuildStepGlobalContext, stepId: string): string;
export declare function getTemporaryEnvsDirPath(ctx: BuildStepGlobalContext, stepId: string): string;
