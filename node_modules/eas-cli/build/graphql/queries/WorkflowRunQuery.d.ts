import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { WorkflowRunByIdQuery, WorkflowRunByIdWithJobsQuery, WorkflowRunFragment, WorkflowRunStatus } from '../generated';
export declare const WorkflowRunQuery: {
    byIdAsync(graphqlClient: ExpoGraphqlClient, workflowRunId: string, { useCache }?: {
        useCache?: boolean;
    }): Promise<WorkflowRunByIdQuery["workflowRuns"]["byId"]>;
    withJobsByIdAsync(graphqlClient: ExpoGraphqlClient, workflowRunId: string, { useCache }?: {
        useCache?: boolean;
    }): Promise<WorkflowRunByIdWithJobsQuery["workflowRuns"]["byId"]>;
    byAppIdFileNameAndStatusAsync(graphqlClient: ExpoGraphqlClient, appId: string, fileName: string, status?: WorkflowRunStatus, limit?: number): Promise<WorkflowRunFragment[]>;
};
