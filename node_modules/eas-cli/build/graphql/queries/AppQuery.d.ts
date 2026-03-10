import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { AppFragment, WorkflowFragment, WorkflowRunFragment, WorkflowRunStatus } from '../generated';
export declare const AppQuery: {
    byIdAsync(graphqlClient: ExpoGraphqlClient, projectId: string): Promise<AppFragment>;
    byFullNameAsync(graphqlClient: ExpoGraphqlClient, fullName: string): Promise<AppFragment>;
    byIdWorkflowsAsync(graphqlClient: ExpoGraphqlClient, appId: string): Promise<WorkflowFragment[]>;
    byIdWorkflowRunsFilteredByStatusAsync(graphqlClient: ExpoGraphqlClient, appId: string, status?: WorkflowRunStatus, limit?: number): Promise<WorkflowRunFragment[]>;
};
