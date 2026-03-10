"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowFile = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const WorkflowRevisionMutation_1 = require("../graphql/mutations/WorkflowRevisionMutation");
const log_1 = tslib_1.__importDefault(require("../log"));
var WorkflowFile;
(function (WorkflowFile) {
    async function readWorkflowFileContentsAsync({ projectDir, filePath, }) {
        const [yamlFromEasWorkflowsFile, yamlFromFile] = await Promise.allSettled([
            fs_1.default.promises.readFile(path_1.default.join(projectDir, '.eas', 'workflows', filePath), 'utf8'),
            fs_1.default.promises.readFile(path_1.default.join(process.cwd(), filePath), 'utf8'),
        ]);
        // We prioritize .eas/workflows/${file} over ${file}, because
        // in the worst case we'll try to read .eas/workflows/.eas/workflows/test.yml,
        // which is likely not to exist.
        if (yamlFromEasWorkflowsFile.status === 'fulfilled') {
            return {
                yamlConfig: yamlFromEasWorkflowsFile.value,
                filePath: path_1.default.join(projectDir, '.eas', 'workflows', filePath),
            };
        }
        else if (yamlFromFile.status === 'fulfilled') {
            return {
                yamlConfig: yamlFromFile.value,
                filePath: path_1.default.join(process.cwd(), filePath),
            };
        }
        throw yamlFromFile.reason;
    }
    WorkflowFile.readWorkflowFileContentsAsync = readWorkflowFileContentsAsync;
    function maybePrintWorkflowFileValidationErrors({ error, }) {
        const validationErrors = error.graphQLErrors.flatMap(e => {
            return WorkflowRevisionMutation_1.WorkflowRevisionMutation.ValidationErrorExtensionZ.safeParse(e.extensions).data ?? [];
        });
        if (validationErrors.length > 0) {
            log_1.default.error('Workflow file is invalid. Issues:');
            for (const validationError of validationErrors) {
                for (const formError of validationError.metadata.formErrors) {
                    log_1.default.error(`- ${formError}`);
                }
                for (const [field, fieldErrors] of Object.entries(validationError.metadata.fieldErrors)) {
                    log_1.default.error(`- ${field}: ${fieldErrors.join(', ')}`);
                }
            }
        }
    }
    WorkflowFile.maybePrintWorkflowFileValidationErrors = maybePrintWorkflowFileValidationErrors;
    function validateYamlExtension(fileName) {
        const fileExtension = path_1.default.extname(fileName).toLowerCase();
        if (fileExtension !== '.yml' && fileExtension !== '.yaml') {
            throw new Error('File must have a .yml or .yaml extension');
        }
    }
    WorkflowFile.validateYamlExtension = validateYamlExtension;
})(WorkflowFile || (exports.WorkflowFile = WorkflowFile = {}));
