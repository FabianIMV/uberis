import { WorkflowJobResult, WorkflowLogLine, WorkflowLogs, WorkflowRunResult, WorkflowTriggerType } from './types';
import { WorkflowRunByIdQuery, WorkflowRunByIdWithJobsQuery, WorkflowRunFragment } from '../../graphql/generated';
import { Choice } from '../../prompts';
import { ExpoGraphqlClient } from '../context/contextUtils/createGraphqlClient';
export declare function computeTriggerInfoForWorkflowRun(run: WorkflowRunFragment): {
    triggerType: WorkflowTriggerType;
    trigger: string | null;
};
export declare function choiceFromWorkflowRun(run: WorkflowRunResult): Choice;
export declare function choiceFromWorkflowJob(job: WorkflowJobResult, index: number): Choice;
export declare function choicesFromWorkflowLogs(logs: WorkflowLogs): (Choice & {
    name: string;
    status: string;
    logLines: WorkflowLogLine[] | undefined;
})[];
export declare function processWorkflowRuns(runs: WorkflowRunFragment[]): WorkflowRunResult[];
export declare function fetchAndProcessLogsFromJobAsync(state: {
    graphqlClient: ExpoGraphqlClient;
}, job: WorkflowJobResult): Promise<WorkflowLogs | null>;
export declare function infoForActiveWorkflowRunAsync(graphqlClient: ExpoGraphqlClient, workflowRun: WorkflowRunByIdWithJobsQuery['workflowRuns']['byId'], maxLogLines?: number): Promise<string>;
export declare function infoForFailedWorkflowRunAsync(graphqlClient: ExpoGraphqlClient, workflowRun: WorkflowRunByIdWithJobsQuery['workflowRuns']['byId'], maxLogLines?: number): Promise<string>;
export declare function fileExistsAsync(filePath: string): Promise<boolean>;
export declare function maybeReadStdinAsync(): Promise<string | null>;
export declare function showWorkflowStatusAsync(graphqlClient: ExpoGraphqlClient, { workflowRunId, spinnerUsesStdErr, waitForCompletion, }: {
    workflowRunId: string;
    spinnerUsesStdErr: boolean;
    waitForCompletion?: boolean;
}): Promise<WorkflowRunByIdQuery['workflowRuns']['byId']>;
export declare const workflowRunExitCodes: {
    WORKFLOW_FAILED: number;
    WORKFLOW_CANCELED: number;
    WAIT_ABORTED: number;
};
