"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWorkflowFileAsync = validateWorkflowFileAsync;
exports.logWorkflowValidationErrors = logWorkflowValidationErrors;
exports.workflowContentsFromParsedYaml = workflowContentsFromParsedYaml;
const tslib_1 = require("tslib");
const errors_1 = require("@expo/eas-json/build/errors");
const core_1 = require("@urql/core");
const fs_1 = require("fs");
const path_1 = tslib_1.__importDefault(require("path"));
const YAML = tslib_1.__importStar(require("yaml"));
const buildProfileUtils_1 = require("./buildProfileUtils");
const api_1 = require("../../api");
const WorkflowRevisionMutation_1 = require("../../graphql/mutations/WorkflowRevisionMutation");
const log_1 = tslib_1.__importDefault(require("../../log"));
const ajv_1 = require("../../metadata/utils/ajv");
const workflowFile_1 = require("../../utils/workflowFile");
const parse_1 = require("./parse");
const jobTypesWithBuildProfile = new Set(['build', 'repack']);
const buildProfileIsInterpolated = (profileName) => {
    return profileName.includes('${{') && profileName.includes('}}');
};
async function validateWorkflowFileAsync(workflowFileContents, projectDir, graphqlClient, projectId) {
    const parsedYaml = (0, parse_1.parsedYamlFromWorkflowContents)(workflowFileContents);
    log_1.default.debug(`Parsed workflow: ${JSON.stringify(parsedYaml, null, 2)}`);
    // Check if the parsed result is empty or null
    log_1.default.debug(`Validating workflow is not empty...`);
    validateWorkflowIsNotEmpty(parsedYaml);
    const workflowSchema = await fetchWorkflowSchemaAsync();
    // Check that all job types are valid
    log_1.default.debug(`Validating workflow job types...`);
    validateWorkflowJobTypes(parsedYaml, workflowSchema);
    // Check for build jobs that do not match any EAS build profiles
    log_1.default.debug(`Validating workflow build jobs...`);
    await validateWorkflowBuildJobsAsync(parsedYaml, projectDir);
    // Check that result passes validation against workflow schema
    log_1.default.debug(`Validating workflow structure...`);
    validateWorkflowStructure(parsedYaml, workflowSchema);
    // Check for other errors using the server-side validation
    log_1.default.debug(`Validating workflow on server...`);
    await validateWorkflowOnServerAsync(graphqlClient, projectId, workflowFileContents);
}
function logWorkflowValidationErrors(error) {
    if (error instanceof errors_1.MissingEasJsonError) {
        throw new Error('Workflows require a valid eas.json. Please run "eas build:configure" to create it.');
    }
    else if (error instanceof errors_1.InvalidEasJsonError) {
        throw new Error('Workflows require a valid eas.json. Please fix the errors in your eas.json and try again.\n\n' +
            error.message);
    }
    else if (error instanceof YAML.YAMLParseError) {
        log_1.default.error(`YAML syntax error: ${error.message}`);
    }
    else if (error instanceof core_1.CombinedError) {
        workflowFile_1.WorkflowFile.maybePrintWorkflowFileValidationErrors({
            error,
        });
        throw error;
    }
    else if (error instanceof Error) {
        log_1.default.error(`Error: ${error.message}`);
    }
    else {
        log_1.default.error(`Unexpected error: ${String(error)}`);
    }
}
function validateWorkflowIsNotEmpty(parsedYaml) {
    if (parsedYaml === null ||
        parsedYaml === undefined ||
        (typeof parsedYaml === 'object' && Object.keys(parsedYaml).length === 0)) {
        throw new Error('YAML file is empty or contains only comments.');
    }
}
async function validateWorkflowOnServerAsync(graphqlClient, projectId, workflowFileContents) {
    await WorkflowRevisionMutation_1.WorkflowRevisionMutation.validateWorkflowYamlConfigAsync(graphqlClient, {
        appId: projectId,
        yamlConfig: workflowFileContents.yamlConfig,
    });
}
async function validateWorkflowBuildJobsAsync(parsedYaml, projectDir) {
    const jobs = jobsFromWorkflow(parsedYaml);
    const buildJobs = jobs.filter(job => jobTypesWithBuildProfile.has(job.value.type));
    if (buildJobs.length === 0) {
        return;
    }
    const buildProfileNames = await (0, buildProfileUtils_1.buildProfileNamesFromProjectAsync)(projectDir);
    const invalidBuildJobs = buildJobs.filter(job => !buildProfileNames.has(job.value.params.profile) &&
        // If a profile name is interpolated, we can't check if it's valid until the workflow actually runs
        !buildProfileIsInterpolated(job.value.params.profile));
    if (invalidBuildJobs.length > 0) {
        const invalidBuildProfiles = new Set(invalidBuildJobs.map(job => job.value.params.profile));
        throw new Error(`The build jobs in this workflow refer to the following build profiles that are not present in your eas.json file: ${[
            ...invalidBuildProfiles,
        ].join(', ')}`);
    }
}
function validateWorkflowJobTypes(parsedYaml, workflowJsonSchema) {
    const jobs = jobsFromWorkflow(parsedYaml);
    const jobTypes = jobTypesFromWorkflowSchema(workflowJsonSchema);
    const invalidJobs = jobs.filter(job => job.value.type && !jobTypes.includes(job.value.type));
    if (invalidJobs.length > 0) {
        throw new Error(`The following jobs have invalid types: ${invalidJobs
            .map(job => job.key)
            .join(', ')}. Valid types are: ${jobTypes.join(', ')}`);
    }
}
function validateWorkflowStructure(parsedYaml, workflowJsonSchema) {
    delete workflowJsonSchema['$schema'];
    const ajv = (0, ajv_1.createValidator)();
    const validate = ajv.compile(workflowJsonSchema);
    const result = validate(parsedYaml);
    if (!result) {
        log_1.default.debug(JSON.stringify({
            errors: validate.errors,
        }, null, 2));
        const readableErrors = (0, ajv_1.getReadableErrors)(validate.errors ?? []);
        const processedErrors = new Set();
        for (const err of readableErrors) {
            if (err.message) {
                processedErrors.add(err.message);
            }
        }
        throw new Error([...processedErrors].join('\n'));
    }
}
function workflowContentsFromParsedYaml(parsedYaml) {
    return YAML.stringify(parsedYaml);
}
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function fetchWorkflowSchemaAsync() {
    // EXPO_TESTING_WORKFLOW_SCHEMA_PATH is used only for testing against a different schema
    if (process.env.EXPO_TESTING_WORKFLOW_SCHEMA_PATH) {
        const schemaPath = path_1.default.resolve(process.env.EXPO_TESTING_WORKFLOW_SCHEMA_PATH);
        log_1.default.debug(`Loading workflow schema from ${schemaPath}`);
        const jsonString = await fs_1.promises.readFile(schemaPath, 'utf-8');
        const jsonFromFile = JSON.parse(jsonString);
        return jsonFromFile.data;
    }
    // Otherwise, we fetch from <ApiBaseUrl>/v2/workflows/schema
    const schemaUrl = (0, api_1.getExpoApiWorkflowSchemaURL)();
    log_1.default.debug(`Fetching workflow schema from ${schemaUrl}`);
    const response = await fetch(schemaUrl);
    if (!response.ok) {
        throw new Error(`Unable to fetch EAS Workflow schema, received status: ${response.status}`);
    }
    const jsonResponse = (await response.json());
    return jsonResponse.data;
}
function jobsFromWorkflow(parsedYaml) {
    return Object.entries(parsedYaml?.jobs).flatMap(([key, value]) => {
        return {
            key,
            value,
        };
    });
}
function jobTypesFromWorkflowSchema(workflowJsonSchema) {
    return workflowJsonSchema?.properties?.jobs?.additionalProperties?.anyOf.map((props) => props.properties.type.const);
}
