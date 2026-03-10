"use strict";
/**
 * EAS Workflow Run Command
 *
 * This command runs an EAS workflow with support for interactive input prompting.
 *
 * Input Sources (in order of precedence):
 * 1. Command line flags (-F key=value)
 * 2. STDIN JSON input (echo '{"key": "value"}' | eas workflow:run)
 * 3. Interactive prompts (when required inputs are missing and not in non-interactive mode)
 *
 * Interactive Prompting:
 * - When running in interactive mode (default), the command will automatically prompt
 *   for any required inputs that are not provided via flags or STDIN
 * - Input types supported: string, boolean, number, choice, environment
 * - Each input type has appropriate validation and default values
 * - Use --non-interactive flag to disable prompting and require all inputs via flags
 *
 * Example workflow with inputs:
 * ```yaml
 * on:
 *   workflow_dispatch:
 *     inputs:
 *       environment:
 *         type: string
 *         required: true
 *         description: "Environment to deploy to"
 *       debug:
 *         type: boolean
 *         default: false
 *         description: "Enable debug mode"
 *       version:
 *         type: number
 *         required: true
 *         description: "Version number"
 *       deployment_type:
 *         type: choice
 *         options: ["staging", "production"]
 *         default: "staging"
 *         description: "Type of deployment"
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
const core_1 = require("@oclif/core");
const core_2 = require("@urql/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const getenv_1 = require("getenv");
const path = tslib_1.__importStar(require("node:path"));
const slash_1 = tslib_1.__importDefault(require("slash"));
const url_1 = require("../../build/utils/url");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const inputs_1 = require("../../commandUtils/workflow/inputs");
const utils_1 = require("../../commandUtils/workflow/utils");
const generated_1 = require("../../graphql/generated");
const WorkflowRevisionMutation_1 = require("../../graphql/mutations/WorkflowRevisionMutation");
const WorkflowRunMutation_1 = require("../../graphql/mutations/WorkflowRunMutation");
const WorkflowRunQuery_1 = require("../../graphql/queries/WorkflowRunQuery");
const log_1 = tslib_1.__importStar(require("../../log"));
const projectUtils_1 = require("../../project/projectUtils");
const uploadAccountScopedFileAsync_1 = require("../../project/uploadAccountScopedFileAsync");
const uploadAccountScopedProjectSourceAsync_1 = require("../../project/uploadAccountScopedProjectSourceAsync");
const json_1 = require("../../utils/json");
const workflowFile_1 = require("../../utils/workflowFile");
class WorkflowRun extends EasCommand_1.default {
    static description = 'run an EAS workflow. The entire local project directory will be packaged and uploaded to EAS servers for the workflow run, unless the --ref flag is used.';
    static args = {
        file: core_1.Args.string({
            description: 'Path to the workflow file to run',
            required: true,
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
        input: core_1.Flags.string({
            char: 'F',
            aliases: ['f', 'field'],
            multiple: true,
            description: 'Add a parameter in key=value format. Use multiple instances of this flag to set multiple inputs.',
            summary: 'Set workflow inputs',
        }),
        ref: core_1.Flags.string({
            description: "The git reference must exist in the project's git repository, and the workflow file must exist at that reference. When this flag is used, the local project is not uploaded; instead, the workflow is run from the exact state of the project at the chosen reference.",
            summary: 'Git reference to run the workflow on',
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
        const { flags, args } = await this.parse(WorkflowRun);
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const { getDynamicPrivateProjectConfigAsync, loggedIn: { graphqlClient }, vcsClient, projectDir, } = await this.getContextAsync(WorkflowRun, {
            nonInteractive: flags['non-interactive'],
            withServerSideEnvironment: null,
        });
        const { projectId, exp: { slug: projectName }, } = await getDynamicPrivateProjectConfigAsync({
            skipPlugins: true,
        });
        const account = await (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(graphqlClient, projectId);
        let yamlConfig;
        let workflowRunId;
        let workflowRevisionId;
        let gitRef;
        if (flags.ref) {
            // Run from git ref
            const fileName = path.basename(args.file);
            // Find the real commit, make sure the ref is valid
            gitRef = (await (0, spawn_async_1.default)('git', ['rev-parse', flags.ref], {
                cwd: projectDir,
            })).output[0].trim();
            if (!gitRef) {
                throw new Error('Failed to resolve git reference');
            }
            log_1.default.log(`Using workflow file ${fileName} at ${gitRef}`);
            let revisionResult;
            try {
                revisionResult = await WorkflowRevisionMutation_1.WorkflowRevisionMutation.getOrCreateWorkflowRevisionFromGitRefAsync(graphqlClient, {
                    appId: projectId,
                    fileName,
                    gitRef,
                });
            }
            catch (err) {
                throw new Error(`Failed to find or create workflow revision for ${fileName} at ${flags.ref}: ${err}`);
            }
            log_1.default.debug(`Workflow revision: ${JSON.stringify(revisionResult, null, 2)}`);
            if (!revisionResult) {
                throw new Error(`Failed to find or create workflow revision for ${fileName} at ${flags.ref}`);
            }
            yamlConfig = revisionResult.yamlConfig;
            workflowRevisionId = revisionResult.id;
        }
        else {
            // Run from local file
            try {
                const workflowFileContents = await workflowFile_1.WorkflowFile.readWorkflowFileContentsAsync({
                    projectDir,
                    filePath: args.file,
                });
                log_1.default.log(`Using workflow file from ${workflowFileContents.filePath}`);
                yamlConfig = workflowFileContents.yamlConfig;
            }
            catch (err) {
                log_1.default.error('Failed to read workflow file.');
                throw err;
            }
        }
        // Validate workflow YAML
        try {
            await WorkflowRevisionMutation_1.WorkflowRevisionMutation.validateWorkflowYamlConfigAsync(graphqlClient, {
                appId: projectId,
                yamlConfig,
            });
        }
        catch (error) {
            if (error instanceof core_2.CombinedError) {
                workflowFile_1.WorkflowFile.maybePrintWorkflowFileValidationErrors({
                    error,
                });
                throw error;
            }
        }
        let inputs;
        // Check for stdin input
        const stdinData = await (0, utils_1.maybeReadStdinAsync)();
        const inputsFromFlags = [...(flags.input ?? [])];
        // Validate that both stdin and -F flags are not provided simultaneously
        if (stdinData && inputsFromFlags.length > 0) {
            throw new Error('Cannot use both stdin JSON input and -F flags simultaneously. Please use only one input method.');
        }
        if (stdinData) {
            inputs = (0, inputs_1.parseJsonInputs)(stdinData);
        }
        else if (inputsFromFlags.length > 0) {
            inputs = (0, inputs_1.parseInputs)(inputsFromFlags);
        }
        // Parse workflow inputs from YAML and prompt for missing required inputs
        const inputSpecs = (0, inputs_1.parseWorkflowInputsFromYaml)(yamlConfig);
        if (!flags['non-interactive']) {
            inputs = await (0, inputs_1.maybePromptForMissingInputsAsync)({ inputSpecs, inputs: inputs ?? {} });
        }
        if (inputs && Object.keys(inputs).length > 0) {
            log_1.default.addNewLineIfNone();
            log_1.default.newLine();
            log_1.default.log('Running with inputs:');
            for (const [key, value] of Object.entries(inputs)) {
                log_1.default.log(`- ${chalk_1.default.bold(key)}: ${JSON.stringify(value)}`);
            }
        }
        let projectArchiveBucketKey;
        let easJsonBucketKey = null;
        let packageJsonBucketKey = null;
        const easJsonPath = path.join(projectDir, 'eas.json');
        const packageJsonPath = path.join(projectDir, 'package.json');
        const projectRootDirectory = (0, slash_1.default)(path.relative(await vcsClient.getRootPathAsync(), projectDir) || '.');
        if (gitRef) {
            // Run from git ref
            let runResult;
            try {
                runResult = await WorkflowRunMutation_1.WorkflowRunMutation.createWorkflowRunFromGitRefAsync(graphqlClient, {
                    workflowRevisionId: workflowRevisionId ?? '',
                    gitRef,
                    inputs,
                });
            }
            catch (err) {
                throw new Error(`Failed to create workflow run: ${err}`);
            }
            workflowRunId = runResult.id;
        }
        else {
            // Run from local file
            try {
                ({ projectArchiveBucketKey } = await (0, uploadAccountScopedProjectSourceAsync_1.uploadAccountScopedProjectSourceAsync)({
                    graphqlClient,
                    vcsClient,
                    accountId: account.id,
                }));
                if (await (0, utils_1.fileExistsAsync)(easJsonPath)) {
                    ({ fileBucketKey: easJsonBucketKey } = await (0, uploadAccountScopedFileAsync_1.uploadAccountScopedFileAsync)({
                        graphqlClient,
                        accountId: account.id,
                        filePath: easJsonPath,
                        maxSizeBytes: 1024 * 1024,
                    }));
                }
                else {
                    log_1.default.warn(`⚠ No ${chalk_1.default.bold('eas.json')} found in the project directory. Running ${chalk_1.default.bold('type: build')} jobs will not work. Run ${chalk_1.default.bold('eas build:configure')} to configure your project for builds.`);
                }
                if (await (0, utils_1.fileExistsAsync)(packageJsonPath)) {
                    ({ fileBucketKey: packageJsonBucketKey } = await (0, uploadAccountScopedFileAsync_1.uploadAccountScopedFileAsync)({
                        graphqlClient,
                        accountId: account.id,
                        filePath: packageJsonPath,
                        maxSizeBytes: 1024 * 1024,
                    }));
                }
                else {
                    log_1.default.warn(`⚠ No ${chalk_1.default.bold('package.json')} found in the project directory. It is used to automatically infer best job configuration for your project. You may want to define ${chalk_1.default.bold('image')} property in your workflow to specify the image to use.`);
                }
            }
            catch (err) {
                log_1.default.error('Failed to upload project sources.');
                throw err;
            }
            try {
                ({ id: workflowRunId } = await WorkflowRunMutation_1.WorkflowRunMutation.createWorkflowRunAsync(graphqlClient, {
                    appId: projectId,
                    workflowRevisionInput: {
                        fileName: path.basename(args.file),
                        yamlConfig,
                    },
                    workflowRunInput: {
                        inputs,
                        projectSource: {
                            type: generated_1.WorkflowProjectSourceType.Gcs,
                            projectArchiveBucketKey,
                            easJsonBucketKey,
                            packageJsonBucketKey,
                            projectRootDirectory,
                        },
                    },
                }));
            }
            catch (err) {
                log_1.default.error('Failed to start the workflow with the API.');
                throw err;
            }
        }
        log_1.default.newLine();
        log_1.default.log(`See logs: ${(0, log_1.link)((0, url_1.getWorkflowRunUrl)(account.name, projectName, workflowRunId))}`);
        if (!flags.wait) {
            if (flags.json) {
                (0, json_1.printJsonOnlyOutput)({
                    id: workflowRunId,
                    url: (0, url_1.getWorkflowRunUrl)(account.name, projectName, workflowRunId),
                });
            }
            process.exit(0);
        }
        const spinnerUsesStdErr = (0, getenv_1.boolish)('CI', false) || flags.json;
        const { status } = await (0, utils_1.showWorkflowStatusAsync)(graphqlClient, {
            workflowRunId,
            spinnerUsesStdErr,
        });
        if (flags.json) {
            const workflowRun = await WorkflowRunQuery_1.WorkflowRunQuery.withJobsByIdAsync(graphqlClient, workflowRunId, {
                useCache: false,
            });
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
exports.default = WorkflowRun;
