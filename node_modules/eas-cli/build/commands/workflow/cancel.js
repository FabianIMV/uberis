"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const utils_1 = require("../../commandUtils/workflow/utils");
const generated_1 = require("../../graphql/generated");
const WorkflowRunMutation_1 = require("../../graphql/mutations/WorkflowRunMutation");
const AppQuery_1 = require("../../graphql/queries/AppQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
class WorkflowRunCancel extends EasCommand_1.default {
    static description = 'Cancel one or more workflow runs. If no workflow run IDs are provided, you will be prompted to select IN_PROGRESS runs to cancel.';
    static strict = false;
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    static flags = {
        ...flags_1.EASNonInteractiveFlag,
    };
    async runAsync() {
        const { argv } = await this.parse(WorkflowRunCancel);
        let nonInteractive = false;
        const workflowRunIds = new Set();
        // Custom parsing of argv
        const tokens = [...argv];
        while (tokens.length > 0) {
            const token = tokens.shift();
            if (token === '--non-interactive') {
                nonInteractive = true;
                continue;
            }
            else if (token) {
                workflowRunIds.add(token);
            }
        }
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(WorkflowRunCancel, {
            nonInteractive,
        });
        if (workflowRunIds.size === 0) {
            if (nonInteractive) {
                throw new Error('Must supply workflow run IDs as arguments when in non-interactive mode');
            }
            // Run the workflow run list query and select runs to cancel
            const queryResult = await AppQuery_1.AppQuery.byIdWorkflowRunsFilteredByStatusAsync(graphqlClient, projectId, generated_1.WorkflowRunStatus.InProgress, 50);
            const runs = (0, utils_1.processWorkflowRuns)(queryResult);
            if (runs.length === 0) {
                log_1.default.warn('No workflow runs to cancel');
                return;
            }
            const answers = await (0, prompts_1.promptAsync)({
                type: 'multiselect',
                name: 'selectedRuns',
                message: 'Select IN_PROGRESS workflow runs to cancel',
                choices: runs.map(run => (0, utils_1.choiceFromWorkflowRun)(run)),
            });
            answers.selectedRuns.forEach((id) => {
                workflowRunIds.add(id);
            });
            if (workflowRunIds.size === 0) {
                log_1.default.warn('No workflow runs to cancel');
                return;
            }
        }
        log_1.default.addNewLineIfNone();
        for (const workflowRunId of workflowRunIds) {
            try {
                await WorkflowRunMutation_1.WorkflowRunMutation.cancelWorkflowRunAsync(graphqlClient, {
                    workflowRunId,
                });
                log_1.default.log(`Workflow run ${workflowRunId} has been canceled.`);
            }
            catch (e) {
                log_1.default.error(`Failed to cancel workflow run ${workflowRunId}: ${e}`);
            }
        }
        log_1.default.addNewLineIfNone();
    }
}
exports.default = WorkflowRunCancel;
