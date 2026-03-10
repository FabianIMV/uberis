"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const formatBuild_1 = require("../../build/utils/formatBuild");
const url_1 = require("../../build/utils/url");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const stateMachine_1 = require("../../commandUtils/workflow/stateMachine");
const utils_1 = require("../../commandUtils/workflow/utils");
const generated_1 = require("../../graphql/generated");
const WorkflowRunQuery_1 = require("../../graphql/queries/WorkflowRunQuery");
const log_1 = tslib_1.__importStar(require("../../log"));
const formatFields_1 = tslib_1.__importDefault(require("../../utils/formatFields"));
const json_1 = require("../../utils/json");
const processedOutputs = job => {
    const result = [];
    const keys = job.outputs ? Object.keys(job.outputs) : [];
    keys.forEach(key => {
        result.push({
            label: `    ${key}`,
            get value() {
                const value = job.outputs[key];
                return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            },
        });
    });
    return result;
};
class WorkflowView extends EasCommand_1.default {
    static description = 'view details for a workflow run, including jobs. If no run ID is provided, you will be prompted to select from recent workflow runs for the current project.';
    static flags = {
        ...flags_1.EasJsonOnlyFlag,
        ...flags_1.EASNonInteractiveFlag,
    };
    static args = {
        id: core_1.Args.string({
            description: 'ID of the workflow run to view',
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args, flags } = await this.parse(WorkflowView);
        const nonInteractive = flags['non-interactive'];
        const { loggedIn: { graphqlClient }, projectId, } = await this.getContextAsync(WorkflowView, {
            nonInteractive,
        });
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        if (nonInteractive && !args.id) {
            throw new Error('If non-interactive, this command requires a workflow run ID as argument');
        }
        const actionResult = await (0, stateMachine_1.workflowRunSelectionAction)({
            graphqlClient,
            projectId,
            nonInteractive,
            allSteps: false,
            state: stateMachine_1.WorkflowCommandSelectionStateValue.WORKFLOW_RUN_SELECTION,
            runId: args.id,
        });
        if (actionResult.state === stateMachine_1.WorkflowCommandSelectionStateValue.ERROR) {
            log_1.default.error(actionResult.message);
            return;
        }
        const idToQuery = actionResult.runId ?? '';
        const result = await WorkflowRunQuery_1.WorkflowRunQuery.withJobsByIdAsync(graphqlClient, idToQuery, {
            useCache: false,
        });
        const { triggerType, trigger } = (0, utils_1.computeTriggerInfoForWorkflowRun)(result);
        result.triggerType = triggerType;
        result.trigger = trigger;
        const processedJobs = result.jobs.map(job => {
            const processedJob = job;
            if (job.type === generated_1.WorkflowJobType.Build) {
                processedJob.artifacts = job.turtleBuild?.artifacts ?? undefined;
            }
            else {
                processedJob.artifacts = job.turtleJobRun?.artifacts;
            }
            delete processedJob.turtleJobRun;
            return processedJob;
        });
        result.jobs = processedJobs;
        result.logURL = (0, url_1.getWorkflowRunUrl)(result.workflow.app.ownerAccount.name, result.workflow.app.name, result.id);
        if (flags.json) {
            (0, json_1.printJsonOnlyOutput)(result);
            return;
        }
        log_1.default.log((0, formatFields_1.default)([
            { label: 'Run ID', value: result.id },
            { label: 'Workflow', value: result.workflow.fileName },
            { label: 'Trigger Type', value: result.triggerType },
            { label: 'Trigger', value: result.trigger ?? 'null' },
            {
                label: 'Git Commit Message',
                value: result.gitCommitMessage?.split('\n')[0] ?? 'null',
            },
            { label: 'Status', value: result.status },
            { label: 'Errors', value: result.errors.map(error => error.title).join('\n') },
            { label: 'Created At', value: result.createdAt },
            { label: 'Updated At', value: result.updatedAt },
            { label: 'Log URL', value: (0, log_1.link)(result.logURL) },
        ]));
        log_1.default.addNewLineIfNone();
        result.jobs.forEach((job) => {
            log_1.default.log((0, formatFields_1.default)([
                { label: 'Job ID', value: job.id },
                { label: '  Key', value: job.key },
                { label: '  Name', value: job.name },
                { label: '  Status', value: job.status },
                { label: '  Type', value: job.type },
                { label: '  Created At', value: job.createdAt },
                { label: '  Updated At', value: job.updatedAt },
            ]));
            if (job.errors.length > 0) {
                log_1.default.gray(chalk_1.default.dim('  Errors:'));
                job.errors.forEach(error => {
                    log_1.default.log((0, formatFields_1.default)([{ label: `    ${error.title}`, value: `${error.message}` }]));
                });
            }
            if (job.outputs) {
                const outputs = processedOutputs(job);
                if (outputs.length > 0) {
                    log_1.default.gray(chalk_1.default.dim('  Outputs:'));
                    log_1.default.log((0, formatFields_1.default)(outputs));
                }
            }
            if (job.type === generated_1.WorkflowJobType.Build) {
                if (job.turtleBuild?.artifacts) {
                    log_1.default.gray(chalk_1.default.dim('  Artifacts:'));
                    log_1.default.log((0, formatFields_1.default)((0, formatBuild_1.formatGraphQLBuildArtifacts)(job.turtleBuild).map(item => {
                        item.label = `    ${item.label}`;
                        return item;
                    })));
                }
            }
            else {
                const jobArtifacts = job.artifacts;
                if (jobArtifacts?.length) {
                    log_1.default.gray(chalk_1.default.dim('  Artifacts:'));
                    jobArtifacts.forEach(artifact => {
                        log_1.default.log((0, formatFields_1.default)([
                            { label: '    ID', value: artifact.id },
                            { label: '    Name', value: artifact.name },
                            { label: '    Content Type', value: artifact?.contentType ?? 'null' },
                            {
                                label: '    File Size Bytes',
                                value: artifact?.fileSizeBytes ? `${artifact.fileSizeBytes}` : 'null',
                            },
                            { label: '    Filename', value: artifact.filename },
                            {
                                label: '    Download URL',
                                value: artifact?.downloadUrl ? (0, log_1.link)(artifact.downloadUrl) : 'null',
                            },
                        ]));
                        log_1.default.addNewLineIfNone();
                    });
                }
            }
            log_1.default.addNewLineIfNone();
        });
    }
}
exports.default = WorkflowView;
