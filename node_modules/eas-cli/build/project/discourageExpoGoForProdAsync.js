"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discourageExpoGoForProdAsync = discourageExpoGoForProdAsync;
exports.detectExpoGoProdBuildAsync = detectExpoGoProdBuildAsync;
const tslib_1 = require("tslib");
const eas_build_job_1 = require("@expo/eas-build-job");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const getenv_1 = tslib_1.__importDefault(require("getenv"));
const workflow_1 = require("./workflow");
const devClient_1 = require("../build/utils/devClient");
const log_1 = tslib_1.__importStar(require("../log"));
const suppressionEnvVarName = 'EAS_BUILD_NO_EXPO_GO_WARNING';
async function discourageExpoGoForProdAsync(buildProfiles, projectDir, vcsClient) {
    try {
        const isExpoGoProdBuild = await detectExpoGoProdBuildAsync(buildProfiles, projectDir, vcsClient);
        if (!isExpoGoProdBuild) {
            return;
        }
        log_1.default.newLine();
        log_1.default.warn(`⚠️ Detected that your app uses Expo Go for development, this is not recommended when building production apps.`);
        log_1.default.warn((0, log_1.learnMore)('https://expo.fyi/why-not-build-expo-go-for-production', {
            dim: false,
        }));
        log_1.default.warn(chalk_1.default.dim(`To suppress this warning, set ${chalk_1.default.bold(`${suppressionEnvVarName}=true`)}.`));
        log_1.default.newLine();
    }
    catch (err) {
        log_1.default.isDebug && log_1.default.warn('Error detecting whether Expo Go is used:', err);
    }
}
async function detectExpoGoProdBuildAsync(buildProfiles, projectDir, vcsClient) {
    const shouldSuppressWarning = getenv_1.default.boolish(suppressionEnvVarName, false);
    const isProductionBuild = buildProfiles?.map(it => it.profileName).includes('production');
    if (shouldSuppressWarning || !isProductionBuild) {
        return false;
    }
    const hasExpoDevClient = (0, devClient_1.isExpoDevClientInstalled)(projectDir);
    if (hasExpoDevClient) {
        return false;
    }
    return await checkIfManagedWorkflowAsync(projectDir, vcsClient);
}
async function checkIfManagedWorkflowAsync(projectDir, vcsClient) {
    const workflows = await (0, workflow_1.resolveWorkflowPerPlatformAsync)(projectDir, vcsClient);
    return workflows.android === eas_build_job_1.Workflow.MANAGED && workflows.ios === eas_build_job_1.Workflow.MANAGED;
}
