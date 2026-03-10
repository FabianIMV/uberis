import { WorkflowJobResult, WorkflowLogs } from './types';
import { ExpoGraphqlClient } from '../context/contextUtils/createGraphqlClient';
export declare enum WorkflowCommandSelectionStateValue {
    WORKFLOW_RUN_SELECTION = "WORKFLOW_RUN_SELECTION",
    WORKFLOW_JOB_SELECTION = "WORKFLOW_JOB_SELECTION",
    WORKFLOW_STEP_SELECTION = "WORKFLOW_STEP_SELECTION",
    FINISH = "FINISH",
    ERROR = "ERROR"
}
export type WorkflowCommandSelectionState = {
    graphqlClient: ExpoGraphqlClient;
    projectId: string;
    nonInteractive: boolean;
    allSteps: boolean;
    state: WorkflowCommandSelectionStateValue;
    runId?: string;
    jobId?: string;
    step?: string;
    job?: WorkflowJobResult;
    logs?: WorkflowLogs | null;
    message?: string;
};
export type WorkflowCommandSelectionStateParameters = Omit<WorkflowCommandSelectionState, 'graphqlClient' | 'projectId' | 'state' | 'nonInteractive' | 'allSteps'>;
export type WorkflowCommandSelectionAction = (prevState: WorkflowCommandSelectionState) => Promise<WorkflowCommandSelectionState>;
export declare function moveToNewWorkflowCommandSelectionState(previousState: WorkflowCommandSelectionState, newStateValue: WorkflowCommandSelectionStateValue, parameters: WorkflowCommandSelectionStateParameters): WorkflowCommandSelectionState;
export declare function moveToWorkflowRunSelectionState(previousState: WorkflowCommandSelectionState, params?: {
    runId?: string | undefined;
}): WorkflowCommandSelectionState;
export declare function moveToWorkflowJobSelectionState(previousState: WorkflowCommandSelectionState, params: {
    jobId?: string | undefined;
    runId?: string | undefined;
}): WorkflowCommandSelectionState;
export declare function moveToWorkflowStepSelectionState(previousState: WorkflowCommandSelectionState, params: {
    job: WorkflowJobResult;
}): WorkflowCommandSelectionState;
export declare function moveToWorkflowSelectionFinishedState(previousState: WorkflowCommandSelectionState, params: {
    step: string;
    logs: WorkflowLogs;
}): WorkflowCommandSelectionState;
export declare function moveToWorkflowSelectionErrorState(previousState: WorkflowCommandSelectionState, message: string): WorkflowCommandSelectionState;
export declare const workflowRunSelectionAction: WorkflowCommandSelectionAction;
export declare const workflowJobSelectionAction: WorkflowCommandSelectionAction;
export declare const workflowStepSelectionAction: WorkflowCommandSelectionAction;
export declare const executeWorkflowSelectionActionsAsync: WorkflowCommandSelectionAction;
