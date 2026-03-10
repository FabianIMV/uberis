import { BuildFragment } from '../../graphql/generated';
export declare function getProjectDashboardUrl(accountName: string, projectName: string): string;
export declare function getBuildLogsUrl(build: BuildFragment, hash?: string): string;
export declare function getArtifactUrl(artifactId: string): string;
export declare function getInternalDistributionInstallUrl(build: BuildFragment): string;
export declare function getUpdateGroupUrl(accountName: string, projectName: string, updateGroupId: string): string;
export declare function getWorkflowRunUrl(accountName: string, projectName: string, workflowRunId: string): string;
export declare function getProjectGitHubSettingsUrl(accountName: string, projectName: string): string;
export declare function getHostingDeploymentsUrl(accountName: string, projectName: string): string;
