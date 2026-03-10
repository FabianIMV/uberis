import { ExpoConfig } from '@expo/config';
export declare enum WorkflowStarterName {
    BUILD = "build",
    UPDATE = "update",
    CUSTOM = "custom",
    DEPLOY = "deploy"
}
export type WorkflowStarter = {
    name: WorkflowStarterName;
    displayName: string;
    defaultFileName: string;
    template: any;
    header: string;
    nextSteps?: string[];
};
export declare function howToRunWorkflow(workflowFileName: string, workflowStarter: WorkflowStarter): string;
export declare const workflowStarters: WorkflowStarter[];
export declare function addBuildJobsToDevelopmentBuildTemplateAsync(projectDir: string, workflowStarter: WorkflowStarter): Promise<WorkflowStarter>;
export declare function ensureProductionBuildProfileExistsAsync(projectDir: string, workflowStarter: WorkflowStarter): Promise<WorkflowStarter>;
export declare function customizeTemplateIfNeededAsync(workflowStarter: WorkflowStarter, projectDir: string, expoConfig: ExpoConfig): Promise<any>;
