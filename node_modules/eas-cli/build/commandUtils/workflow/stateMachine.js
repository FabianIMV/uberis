"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWorkflowSelectionActionsAsync = exports.workflowStepSelectionAction = exports.workflowJobSelectionAction = exports.workflowRunSelectionAction = exports.WorkflowCommandSelectionStateValue = void 0;
exports.moveToNewWorkflowCommandSelectionState = moveToNewWorkflowCommandSelectionState;
exports.moveToWorkflowRunSelectionState = moveToWorkflowRunSelectionState;
exports.moveToWorkflowJobSelectionState = moveToWorkflowJobSelectionState;
exports.moveToWorkflowStepSelectionState = moveToWorkflowStepSelectionState;
exports.moveToWorkflowSelectionFinishedState = moveToWorkflowSelectionFinishedState;
exports.moveToWorkflowSelectionErrorState = moveToWorkflowSelectionErrorState;
const tslib_1 = require("tslib");
const utils_1 = require("./utils");
const AppQuery_1 = require("../../graphql/queries/AppQuery");
const WorkflowJobQuery_1 = require("../../graphql/queries/WorkflowJobQuery");
const WorkflowRunQuery_1 = require("../../graphql/queries/WorkflowRunQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
/*
 * State machine types and functions for moving between different workflow command states
 */
var WorkflowCommandSelectionStateValue;
(function (WorkflowCommandSelectionStateValue) {
    WorkflowCommandSelectionStateValue["WORKFLOW_RUN_SELECTION"] = "WORKFLOW_RUN_SELECTION";
    WorkflowCommandSelectionStateValue["WORKFLOW_JOB_SELECTION"] = "WORKFLOW_JOB_SELECTION";
    WorkflowCommandSelectionStateValue["WORKFLOW_STEP_SELECTION"] = "WORKFLOW_STEP_SELECTION";
    WorkflowCommandSelectionStateValue["FINISH"] = "FINISH";
    WorkflowCommandSelectionStateValue["ERROR"] = "ERROR";
})(WorkflowCommandSelectionStateValue || (exports.WorkflowCommandSelectionStateValue = WorkflowCommandSelectionStateValue = {}));
const workflowCommandSelectionAllowedStateTransitions = {
    WORKFLOW_JOB_SELECTION: [
        WorkflowCommandSelectionStateValue.WORKFLOW_STEP_SELECTION,
        WorkflowCommandSelectionStateValue.WORKFLOW_RUN_SELECTION,
        WorkflowCommandSelectionStateValue.ERROR,
        WorkflowCommandSelectionStateValue.FINISH,
    ],
    WORKFLOW_RUN_SELECTION: [
        WorkflowCommandSelectionStateValue.WORKFLOW_JOB_SELECTION,
        WorkflowCommandSelectionStateValue.ERROR,
    ],
    WORKFLOW_STEP_SELECTION: [
        WorkflowCommandSelectionStateValue.WORKFLOW_JOB_SELECTION,
        WorkflowCommandSelectionStateValue.ERROR,
        WorkflowCommandSelectionStateValue.FINISH,
    ],
    ERROR: [WorkflowCommandSelectionStateValue.WORKFLOW_RUN_SELECTION],
    FINISH: [],
};
function moveToNewWorkflowCommandSelectionState(previousState, newStateValue, parameters) {
    if (!workflowCommandSelectionAllowedStateTransitions[previousState.state].includes(newStateValue)) {
        const errorMessage = `Invalid state transition from ${previousState.state} to ${newStateValue}. Allowed transitions from ${previousState.state}: ${workflowCommandSelectionAllowedStateTransitions[previousState.state].join(', ')}`;
        throw new Error(errorMessage);
    }
    return {
        ...previousState,
        state: newStateValue,
        ...parameters,
    };
}
function moveToWorkflowRunSelectionState(previousState, params) {
    return moveToNewWorkflowCommandSelectionState(previousState, WorkflowCommandSelectionStateValue.WORKFLOW_RUN_SELECTION, {
        runId: params?.runId,
        jobId: undefined,
    });
}
function moveToWorkflowJobSelectionState(previousState, params) {
    return moveToNewWorkflowCommandSelectionState(previousState, WorkflowCommandSelectionStateValue.WORKFLOW_JOB_SELECTION, params);
}
function moveToWorkflowStepSelectionState(previousState, params) {
    return moveToNewWorkflowCommandSelectionState(previousState, WorkflowCommandSelectionStateValue.WORKFLOW_STEP_SELECTION, params);
}
function moveToWorkflowSelectionFinishedState(previousState, params) {
    return moveToNewWorkflowCommandSelectionState(previousState, WorkflowCommandSelectionStateValue.FINISH, params);
}
function moveToWorkflowSelectionErrorState(previousState, message) {
    return moveToNewWorkflowCommandSelectionState(previousState, WorkflowCommandSelectionStateValue.ERROR, {
        message,
    });
}
// eslint-disable-next-line async-protect/async-suffix
const workflowRunSelectionAction = async (prevState) => {
    const { graphqlClient, projectId, runId, jobId, allSteps } = prevState;
    log_1.default.debug(`workflowRunSelectionAction: runId = ${runId}, jobId = ${jobId}, allSteps = ${allSteps}`);
    if (runId) {
        return moveToWorkflowJobSelectionState(prevState, { runId });
    }
    const runs = await AppQuery_1.AppQuery.byIdWorkflowRunsFilteredByStatusAsync(graphqlClient, projectId, undefined, 20);
    if (runs.length === 0) {
        return moveToWorkflowSelectionErrorState(prevState, 'No workflow runs found');
    }
    const processedRuns = (0, utils_1.processWorkflowRuns)(runs);
    const choices = processedRuns.map(run => (0, utils_1.choiceFromWorkflowRun)(run));
    const selectedId = (await (0, prompts_1.promptAsync)({
        type: 'select',
        name: 'selectedRun',
        message: 'Select a workflow run:',
        choices,
    })).selectedRun;
    return moveToWorkflowJobSelectionState(prevState, { runId: selectedId });
};
exports.workflowRunSelectionAction = workflowRunSelectionAction;
// eslint-disable-next-line async-protect/async-suffix
const workflowJobSelectionAction = async (prevState) => {
    const { graphqlClient, runId, jobId, nonInteractive, allSteps } = prevState;
    log_1.default.debug(`workflowJobSelectionAction: runId = ${runId}, jobId = ${jobId}, allSteps = ${allSteps}`);
    if (jobId) {
        let workflowJobResult = undefined;
        try {
            workflowJobResult = await WorkflowJobQuery_1.WorkflowJobQuery.byIdAsync(graphqlClient, jobId, {
                useCache: false,
            });
            return moveToWorkflowStepSelectionState(prevState, { job: workflowJobResult });
        }
        catch { }
        if (nonInteractive && !workflowJobResult) {
            return moveToWorkflowSelectionErrorState(prevState, 'No workflow job found that matched the provided ID');
        }
        else {
            // The passed in ID may be a run ID, pass it back to run selection action
            return moveToWorkflowRunSelectionState(prevState, { runId: jobId });
        }
    }
    else {
        // No job ID was passed in
        if (nonInteractive) {
            return moveToWorkflowSelectionErrorState(prevState, 'No workflow job ID provided in non-interactive mode');
        }
        else if (!runId) {
            // If no jobId or runId, we should go back to run selection
            return moveToWorkflowRunSelectionState(prevState);
        }
        const workflowRunResult = await WorkflowRunQuery_1.WorkflowRunQuery.withJobsByIdAsync(graphqlClient, runId, {
            useCache: false,
        });
        if (!workflowRunResult) {
            return moveToWorkflowSelectionErrorState(prevState, 'No workflow run found that matched the provided ID');
        }
        const choices = [
            ...workflowRunResult.jobs.map((job, i) => (0, utils_1.choiceFromWorkflowJob)(job, i)),
            {
                title: 'Go back and select a different workflow run',
                value: -1,
            },
        ];
        const selectedJobIndex = (await (0, prompts_1.promptAsync)({
            type: 'select',
            name: 'selectedJob',
            message: 'Select a job:',
            choices,
        })).selectedJob;
        if (selectedJobIndex === -1) {
            return moveToWorkflowRunSelectionState(prevState);
        }
        const selectedJob = workflowRunResult.jobs[selectedJobIndex];
        return moveToWorkflowStepSelectionState(prevState, { job: selectedJob });
    }
};
exports.workflowJobSelectionAction = workflowJobSelectionAction;
// eslint-disable-next-line async-protect/async-suffix
const workflowStepSelectionAction = async (prevState) => {
    const { job, allSteps } = prevState;
    log_1.default.debug(`workflowStepSelectionAction: job = ${job?.id}, allSteps = ${allSteps}`);
    if (!job) {
        return moveToWorkflowSelectionErrorState(prevState, 'No job found');
    }
    const logs = await (0, utils_1.fetchAndProcessLogsFromJobAsync)(prevState, job);
    if (!logs) {
        return moveToWorkflowSelectionErrorState(prevState, 'No logs found');
    }
    if (allSteps) {
        return moveToWorkflowSelectionFinishedState(prevState, { step: '', logs });
    }
    const choices = [
        ...(0, utils_1.choicesFromWorkflowLogs)(logs),
        {
            title: 'Go back and select a different workflow job',
            value: 'go-back',
        },
    ];
    const selectedStep = (await (0, prompts_1.promptAsync)({
        type: 'select',
        name: 'selectedStep',
        message: 'Select a step:',
        choices,
    })).selectedStep ?? '';
    if (selectedStep === 'go-back') {
        return moveToWorkflowJobSelectionState(prevState, {
            runId: job.workflowRun.id,
            jobId: undefined,
        });
    }
    return moveToWorkflowSelectionFinishedState(prevState, { step: selectedStep, logs });
};
exports.workflowStepSelectionAction = workflowStepSelectionAction;
const executeWorkflowSelectionActionsAsync = async (prevState) => {
    let currentState = prevState;
    while (currentState.state !== WorkflowCommandSelectionStateValue.FINISH &&
        currentState.state !== WorkflowCommandSelectionStateValue.ERROR) {
        log_1.default.debug(`${currentState.state}`);
        switch (currentState.state) {
            case WorkflowCommandSelectionStateValue.WORKFLOW_JOB_SELECTION:
                currentState = await (0, exports.workflowJobSelectionAction)(currentState);
                break;
            case WorkflowCommandSelectionStateValue.WORKFLOW_RUN_SELECTION:
                currentState = await (0, exports.workflowRunSelectionAction)(currentState);
                break;
            case WorkflowCommandSelectionStateValue.WORKFLOW_STEP_SELECTION:
                currentState = await (0, exports.workflowStepSelectionAction)(currentState);
                break;
        }
    }
    return currentState;
};
exports.executeWorkflowSelectionActionsAsync = executeWorkflowSelectionActionsAsync;
