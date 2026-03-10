"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCreate = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const promises_1 = tslib_1.__importDefault(require("fs/promises"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const buildProfileUtils_1 = require("../../commandUtils/workflow/buildProfileUtils");
const creation_1 = require("../../commandUtils/workflow/creation");
const validation_1 = require("../../commandUtils/workflow/validation");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const formatFields_1 = tslib_1.__importDefault(require("../../utils/formatFields"));
const workflowFile_1 = require("../../utils/workflowFile");
class WorkflowCreate extends EasCommand_1.default {
    static description = 'create a new workflow configuration YAML file';
    static args = {
        name: core_1.Args.string({
            description: 'Name of the workflow file (must end with .yml or .yaml)',
            required: false,
        }),
    };
    static flags = {
        'skip-validation': core_1.Flags.boolean({
            description: 'If set, the workflow file will not be validated before being created',
            default: false,
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.ProjectDir,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args: { name: argFileName }, flags, } = await this.parse(WorkflowCreate);
        try {
            const { getDynamicPrivateProjectConfigAsync, loggedIn: { graphqlClient }, projectDir, } = await this.getContextAsync(WorkflowCreate, {
                nonInteractive: false,
                withServerSideEnvironment: null,
            });
            const { exp: originalExpoConfig, projectId } = await getDynamicPrivateProjectConfigAsync();
            let expoConfig = originalExpoConfig;
            let workflowStarter;
            while (!workflowStarter) {
                workflowStarter = await chooseTemplateAsync();
                switch (workflowStarter.name) {
                    case creation_1.WorkflowStarterName.BUILD:
                    case creation_1.WorkflowStarterName.DEPLOY:
                    case creation_1.WorkflowStarterName.UPDATE: {
                        const shouldProceed = await (0, buildProfileUtils_1.runBuildConfigureIfNeededAsync)({
                            projectDir,
                            expoConfig,
                        });
                        if (!shouldProceed) {
                            workflowStarter = undefined;
                            continue;
                        }
                        break;
                    }
                    default:
                        break;
                }
                switch (workflowStarter.name) {
                    case creation_1.WorkflowStarterName.DEPLOY:
                    case creation_1.WorkflowStarterName.UPDATE: {
                        const shouldProceed = await (0, buildProfileUtils_1.runUpdateConfigureIfNeededAsync)({
                            projectDir,
                            expoConfig,
                        });
                        if (!shouldProceed) {
                            workflowStarter = undefined;
                            continue;
                        }
                        // Need to refetch the Expo config because it may have changed
                        expoConfig = (await getDynamicPrivateProjectConfigAsync()).exp;
                        break;
                    }
                    default:
                        break;
                }
            }
            const { fileName, filePath } = await chooseFileNameAsync(argFileName, projectDir, workflowStarter);
            // Customize the template if needed
            workflowStarter = await (0, creation_1.customizeTemplateIfNeededAsync)(workflowStarter, projectDir, expoConfig);
            log_1.default.debug(`Creating workflow file ${fileName} from template ${workflowStarter.name}`);
            const yamlString = [
                workflowStarter.header,
                (0, validation_1.workflowContentsFromParsedYaml)(workflowStarter.template),
            ].join('\n');
            if (!flags['skip-validation']) {
                await (0, validation_1.validateWorkflowFileAsync)({ yamlConfig: yamlString, filePath: fileName }, projectDir, graphqlClient, projectId);
            }
            await ensureWorkflowsDirectoryExistsAsync({ projectDir });
            filePath && (await promises_1.default.writeFile(filePath, yamlString));
            log_1.default.withTick(`Created ${chalk_1.default.bold(filePath)}`);
            log_1.default.addNewLineIfNone();
            log_1.default.log((0, creation_1.howToRunWorkflow)(fileName, workflowStarter));
            // Next steps
            if (workflowStarter.nextSteps && workflowStarter.nextSteps.length > 0) {
                log_1.default.addNewLineIfNone();
                log_1.default.log('Next steps:');
                log_1.default.addNewLineIfNone();
                log_1.default.log((0, formatFields_1.default)(workflowStarter.nextSteps.map((step, index) => ({
                    label: `${index + 1}.`,
                    value: step,
                }))));
            }
        }
        catch (error) {
            (0, validation_1.logWorkflowValidationErrors)(error);
            log_1.default.error('Failed to create workflow file.');
        }
    }
}
exports.WorkflowCreate = WorkflowCreate;
async function ensureWorkflowsDirectoryExistsAsync({ projectDir, }) {
    try {
        await promises_1.default.access(path_1.default.join(projectDir, '.eas', 'workflows'));
    }
    catch {
        await promises_1.default.mkdir(path_1.default.join(projectDir, '.eas', 'workflows'), { recursive: true });
        log_1.default.withTick(`Created directory ${chalk_1.default.bold(path_1.default.join(projectDir, '.eas', 'workflows'))}`);
    }
}
async function chooseTemplateAsync() {
    const workflowStarter = (await (0, prompts_1.promptAsync)({
        type: 'select',
        name: 'starter',
        message: 'Select a workflow template:',
        choices: creation_1.workflowStarters.map(starter => ({
            title: starter.displayName,
            value: starter,
        })),
    })).starter;
    return workflowStarter;
}
async function chooseFileNameAsync(initialValue, projectDir, workflowStarter) {
    let fileName = initialValue;
    let filePath = '';
    while ((fileName?.length ?? 0) === 0) {
        fileName = (await (0, prompts_1.promptAsync)({
            type: 'text',
            name: 'fileName',
            message: 'What would you like to name your workflow file?',
            initial: workflowStarter.defaultFileName,
        })).fileName;
        if (!fileName) {
            fileName = undefined;
            continue;
        }
        try {
            workflowFile_1.WorkflowFile.validateYamlExtension(fileName);
        }
        catch (error) {
            log_1.default.error(error instanceof Error ? error.message : 'Invalid YAML file name extension');
            fileName = undefined;
            continue;
        }
        filePath = path_1.default.join(projectDir, '.eas', 'workflows', fileName);
        if (await fs_extra_1.default.pathExists(filePath)) {
            log_1.default.error(`Workflow file already exists: ${filePath}`);
            log_1.default.error('Please choose a different file name.');
            log_1.default.newLine();
            fileName = undefined;
        }
    }
    return { fileName: fileName ?? '', filePath };
}
