"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFingerprintInfoFromLocalProjectForPlatformsAsync = getFingerprintInfoFromLocalProjectForPlatformsAsync;
exports.appPlatformToPlatform = appPlatformToPlatform;
exports.appPlatformToString = appPlatformToString;
exports.stringToAppPlatform = stringToAppPlatform;
const tslib_1 = require("tslib");
const eas_build_job_1 = require("@expo/eas-build-job");
const cli_1 = require("./cli");
const generated_1 = require("../graphql/generated");
const FingerprintMutation_1 = require("../graphql/mutations/FingerprintMutation");
const log_1 = tslib_1.__importDefault(require("../log"));
const maybeUploadFingerprintAsync_1 = require("../project/maybeUploadFingerprintAsync");
const workflow_1 = require("../project/workflow");
async function getFingerprintInfoFromLocalProjectForPlatformsAsync(graphqlClient, projectDir, projectId, vcsClient, platforms, { env } = {}) {
    const workflows = await (0, workflow_1.resolveWorkflowPerPlatformAsync)(projectDir, vcsClient);
    const optionsFromWorkflow = getFingerprintOptionsFromWorkflow(platforms, workflows);
    const projectFingerprint = await (0, cli_1.createFingerprintAsync)(projectDir, {
        ...optionsFromWorkflow,
        platforms: platforms.map(appPlatformToString),
        debug: true,
        env,
    });
    if (!projectFingerprint) {
        throw new Error('Project fingerprints can only be computed for projects with SDK 52 or higher');
    }
    const uploadedFingerprint = await (0, maybeUploadFingerprintAsync_1.maybeUploadFingerprintAsync)({
        hash: projectFingerprint.hash,
        fingerprint: {
            fingerprintSources: projectFingerprint.sources,
            isDebugFingerprintSource: log_1.default.isDebug,
        },
        graphqlClient,
    });
    await FingerprintMutation_1.FingerprintMutation.createFingerprintAsync(graphqlClient, projectId, {
        hash: uploadedFingerprint.hash,
        source: uploadedFingerprint.fingerprintSource,
    });
    return projectFingerprint;
}
function getFingerprintOptionsFromWorkflow(platforms, workflowsByPlatform) {
    if (platforms.length === 0) {
        throw new Error('Could not determine platform from fingerprint sources');
    }
    // Single platform case
    if (platforms.length === 1) {
        const platform = platforms[0];
        return { workflow: workflowsByPlatform[appPlatformToPlatform(platform)] };
    }
    // Multiple platforms case
    const workflows = platforms.map(platform => workflowsByPlatform[appPlatformToPlatform(platform)]);
    // If all workflows are the same, return the common workflow
    const [firstWorkflow, ...restWorkflows] = workflows;
    if (restWorkflows.every(workflow => workflow === firstWorkflow)) {
        return { workflow: firstWorkflow };
    }
    // Generate ignorePaths for mixed workflows
    const ignorePaths = platforms
        .filter(platform => workflowsByPlatform[appPlatformToPlatform(platform)] === eas_build_job_1.Workflow.MANAGED)
        .map(platform => `${appPlatformToString(platform)}/**/*`);
    return { ignorePaths };
}
function appPlatformToPlatform(platform) {
    switch (platform) {
        case generated_1.AppPlatform.Android:
            return eas_build_job_1.Platform.ANDROID;
        case generated_1.AppPlatform.Ios:
            return eas_build_job_1.Platform.IOS;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
function appPlatformToString(platform) {
    switch (platform) {
        case generated_1.AppPlatform.Android:
            return 'android';
        case generated_1.AppPlatform.Ios:
            return 'ios';
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
function stringToAppPlatform(platform) {
    switch (platform) {
        case 'android':
            return generated_1.AppPlatform.Android;
        case 'ios':
            return generated_1.AppPlatform.Ios;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
