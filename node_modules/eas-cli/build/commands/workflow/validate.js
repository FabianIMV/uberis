"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowValidate = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const validation_1 = require("../../commandUtils/workflow/validation");
const log_1 = tslib_1.__importDefault(require("../../log"));
const ora_1 = require("../../ora");
const workflowFile_1 = require("../../utils/workflowFile");
class WorkflowValidate extends EasCommand_1.default {
    static description = 'validate a workflow configuration yaml file';
    static args = {
        path: core_1.Args.string({
            description: 'Path to the workflow configuration YAML file (must end with .yml or .yaml)',
            required: true,
        }),
    };
    static flags = {
        ...flags_1.EASNonInteractiveFlag,
    };
    static contextDefinition = {
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.ProjectDir,
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args: { path: filePath }, flags, } = await this.parse(WorkflowValidate);
        const spinner = (0, ora_1.ora)().start('Validating the workflow YAML file…');
        try {
            const { loggedIn: { graphqlClient }, projectDir, projectId, } = await this.getContextAsync(WorkflowValidate, {
                nonInteractive: flags['non-interactive'],
                withServerSideEnvironment: null,
            });
            const workflowFileContents = await workflowFile_1.WorkflowFile.readWorkflowFileContentsAsync({
                projectDir,
                filePath,
            });
            log_1.default.log(`Using workflow file from ${workflowFileContents.filePath}`);
            await (0, validation_1.validateWorkflowFileAsync)(workflowFileContents, projectDir, graphqlClient, projectId);
            spinner.succeed('Workflow configuration YAML is valid.');
        }
        catch (error) {
            spinner.fail('Workflow configuration YAML is not valid.');
            (0, validation_1.logWorkflowValidationErrors)(error);
        }
    }
}
exports.WorkflowValidate = WorkflowValidate;
