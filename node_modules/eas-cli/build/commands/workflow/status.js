"use strict";
/**
 * EAS Workflow Status Command
 *
 * This command shows the status of an existing workflow run.
 *
 * If no run ID is provided, you will be prompted to select from recent workflow runs for the current project.
 *
 * If the selected run is still in progress, the command will show the progress of the run, with an option
 * to show periodic status updates while waiting for completion (similar to `eas workflow:run --wait`).
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const getenv_1 = require("getenv");
const url_1 = require("../../build/utils/url");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const utils_1 = require("../../commandUtils/workflow/utils");
const generated_1 = require("../../graphql/generated");
const AppQuery_1 = require("../../graphql/queries/AppQuery");
const WorkflowRunQuery_1 = require("../../graphql/queries/WorkflowRunQuery");
const log_1 = tslib_1.__importStar(require("../../log"));
const projectUtils_1 = require("../../project/projectUtils");
const prompts_1 = require("../../prompts");
const json_1 = require("../../utils/json");
class WorkflowStatus extends EasCommand_1.default {
    static description = 'show the status of an existing workflow run. If no run ID is provided, you will be prompted to select from recent workflow runs for the current project.';
    static args = {
        WORKFLOW_RUN_ID: core_1.Args.string({
            description: 'A workflow run ID.',
        }),
    };
    static flags = {
        ...flags_1.EASNonInteractiveFlag,
        wait: core_1.Flags.boolean({
            default: false,
            allowNo: true,
            description: 'Exit codes: 0 = success, 11 = failure, 12 = canceled, 13 = wait aborted.',
            summary: 'Wait for workflow run to complete. Defaults to false.',
        }),
        ...flags_1.EasJsonOnlyFlag,
    };
    static contextDefinition = {
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.ProjectDir,
        ...this.ContextOptions.Vcs,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags, args } = await this.parse(WorkflowStatus);
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const { getDynamicPrivateProjectConfigAsync, loggedIn: { graphqlClient }, } = await this.getContextAsync(WorkflowStatus, {
            nonInteractive: flags['non-interactive'],
            withServerSideEnvironment: null,
        });
        const { projectId, exp: { slug: projectName }, } = await getDynamicPrivateProjectConfigAsync();
        const account = await (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(graphqlClient, projectId);
        let workflowRunId = args.WORKFLOW_RUN_ID;
        if (!workflowRunId && flags['non-interactive']) {
            throw new Error('Workflow run ID is required in non-interactive mode');
        }
        if (!workflowRunId) {
            const queryResult = await AppQuery_1.AppQuery.byIdWorkflowRunsFilteredByStatusAsync(graphqlClient, projectId, undefined, 50);
            const runs = (0, utils_1.processWorkflowRuns)(queryResult);
            if (runs.length === 0) {
                log_1.default.warn('No workflow runs to show');
                return;
            }
            const answers = await (0, prompts_1.promptAsync)({
                type: 'select',
                name: 'selectedRun',
                message: 'Select a workflow run:',
                choices: runs.map(run => (0, utils_1.choiceFromWorkflowRun)(run)),
            });
            workflowRunId = answers.selectedRun;
            if (!workflowRunId) {
                throw new Error('No workflow run selected');
            }
        }
        log_1.default.addNewLineIfNone();
        log_1.default.log(`See logs: ${(0, log_1.link)((0, url_1.getWorkflowRunUrl)(account.name, projectName, workflowRunId))}`);
        log_1.default.addNewLineIfNone();
        const spinnerUsesStdErr = (0, getenv_1.boolish)('CI', false) || flags.json;
        await (0, utils_1.showWorkflowStatusAsync)(graphqlClient, {
            workflowRunId,
            spinnerUsesStdErr,
            waitForCompletion: flags.wait,
        });
        const workflowRun = await WorkflowRunQuery_1.WorkflowRunQuery.withJobsByIdAsync(graphqlClient, workflowRunId, {
            useCache: false,
        });
        const status = workflowRun.status;
        if (flags.json) {
            (0, json_1.printJsonOnlyOutput)({
                ...workflowRun,
                url: (0, url_1.getWorkflowRunUrl)(account.name, projectName, workflowRunId),
            });
        }
        if (status === generated_1.WorkflowRunStatus.Failure) {
            process.exit(utils_1.workflowRunExitCodes.WORKFLOW_FAILED);
        }
        else if (status === generated_1.WorkflowRunStatus.Canceled) {
            process.exit(utils_1.workflowRunExitCodes.WORKFLOW_CANCELED);
        }
    }
}
exports.default = WorkflowStatus;
