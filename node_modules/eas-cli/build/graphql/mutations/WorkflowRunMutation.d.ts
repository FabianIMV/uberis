import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { WorkflowProjectSourceInput, WorkflowRevisionInput, WorkflowRunInput } from '../generated';
export declare namespace WorkflowRunMutation {
    function createWorkflowRunAsync(graphqlClient: ExpoGraphqlClient, { appId, workflowRevisionInput, workflowRunInput, }: {
        appId: string;
        workflowRevisionInput: WorkflowRevisionInput;
        workflowRunInput: WorkflowRunInput;
    }): Promise<{
        id: string;
    }>;
    function createWorkflowRunFromGitRefAsync(graphqlClient: ExpoGraphqlClient, { workflowRevisionId, gitRef, inputs, }: {
        workflowRevisionId: string;
        gitRef: string;
        inputs?: Record<string, any>;
    }): Promise<{
        id: string;
    }>;
    function createExpoGoRepackWorkflowRunAsync(graphqlClient: ExpoGraphqlClient, { appId, projectSource, }: {
        appId: string;
        projectSource: WorkflowProjectSourceInput;
    }): Promise<{
        id: string;
    }>;
    function cancelWorkflowRunAsync(graphqlClient: ExpoGraphqlClient, { workflowRunId, }: {
        workflowRunId: string;
    }): Promise<void>;
}
