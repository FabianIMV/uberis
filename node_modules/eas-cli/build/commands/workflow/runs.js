"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const pagination_1 = require("../../commandUtils/pagination");
const utils_1 = require("../../commandUtils/workflow/utils");
const generated_1 = require("../../graphql/generated");
const AppQuery_1 = require("../../graphql/queries/AppQuery");
const WorkflowRunQuery_1 = require("../../graphql/queries/WorkflowRunQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const formatFields_1 = tslib_1.__importDefault(require("../../utils/formatFields"));
const json_1 = require("../../utils/json");
class WorkflowRunList extends EasCommand_1.default {
    static description = 'list recent workflow runs for this project, with their IDs, statuses, and timestamps';
    static flags = {
        workflow: core_1.Flags.string({
            description: 'If present, the query will only return runs for the specified workflow file name',
            required: false,
        }),
        status: core_1.Flags.option({
            description: 'If present, filter the returned runs to select those with the specified status',
            required: false,
            options: Object.values(generated_1.WorkflowRunStatus),
        })(),
        ...flags_1.EasJsonOnlyFlag,
        limit: (0, pagination_1.getLimitFlagWithCustomValues)({ defaultTo: 10, limit: 100 }),
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags } = await this.parse(WorkflowRunList);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(WorkflowRunList, {
            nonInteractive: true,
        });
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const workflowFileName = flags.workflow;
        const status = flags.status;
        const limit = flags.limit ?? 10;
        let runs;
        if (workflowFileName) {
            runs = await WorkflowRunQuery_1.WorkflowRunQuery.byAppIdFileNameAndStatusAsync(graphqlClient, projectId, workflowFileName, status, limit);
        }
        else {
            runs = await AppQuery_1.AppQuery.byIdWorkflowRunsFilteredByStatusAsync(graphqlClient, projectId, status, limit);
        }
        const result = (0, utils_1.processWorkflowRuns)(runs);
        if (flags.json) {
            (0, json_1.printJsonOnlyOutput)(result);
            return;
        }
        log_1.default.addNewLineIfNone();
        result.forEach(run => {
            log_1.default.log((0, formatFields_1.default)([
                { label: 'Run ID', value: run.id },
                { label: 'Workflow', value: run.workflowFileName },
                { label: 'Status', value: run.status },
                { label: 'Started At', value: run.startedAt },
                { label: 'Finished At', value: run.finishedAt },
                { label: 'Trigger Type', value: run.triggerType },
                { label: 'Trigger', value: run.trigger ?? 'null' },
                { label: 'Git Commit Message', value: run.gitCommitMessage ?? 'null' },
            ]));
            log_1.default.addNewLineIfNone();
        });
    }
}
exports.default = WorkflowRunList;
