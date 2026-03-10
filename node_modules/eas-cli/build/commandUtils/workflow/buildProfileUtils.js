"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProfileNamesFromProjectAsync = buildProfileNamesFromProjectAsync;
exports.getBuildProfileAsync = getBuildProfileAsync;
exports.buildProfilesFromProjectAsync = buildProfilesFromProjectAsync;
exports.isBuildProfileForDevelopment = isBuildProfileForDevelopment;
exports.isIosBuildProfileForSimulator = isIosBuildProfileForSimulator;
exports.addAndroidDevelopmentBuildProfileToEasJsonAsync = addAndroidDevelopmentBuildProfileToEasJsonAsync;
exports.addIosDevelopmentBuildProfileToEasJsonAsync = addIosDevelopmentBuildProfileToEasJsonAsync;
exports.addProductionBuildProfileToEasJsonIfNeededAsync = addProductionBuildProfileToEasJsonIfNeededAsync;
exports.hasBuildConfigureBeenRunAsync = hasBuildConfigureBeenRunAsync;
exports.hasUpdateConfigureBeenRunAsync = hasUpdateConfigureBeenRunAsync;
exports.runUpdateConfigureIfNeededAsync = runUpdateConfigureIfNeededAsync;
exports.runBuildConfigureIfNeededAsync = runBuildConfigureIfNeededAsync;
const tslib_1 = require("tslib");
const eas_json_1 = require("@expo/eas-json");
const configure_1 = tslib_1.__importDefault(require("../../commands/build/configure"));
const configure_2 = tslib_1.__importDefault(require("../../commands/update/configure"));
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
async function buildProfileNamesFromProjectAsync(projectDir) {
    const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
    const buildProfileNames = new Set(easJsonAccessor && (await eas_json_1.EasJsonUtils.getBuildProfileNamesAsync(easJsonAccessor)));
    return buildProfileNames;
}
async function getBuildProfileAsync(projectDir, platform, profileName) {
    const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
    const buildProfile = await eas_json_1.EasJsonUtils.getBuildProfileAsync(easJsonAccessor, platform, profileName);
    return buildProfile;
}
async function buildProfilesFromProjectAsync(projectDir) {
    const buildProfileNames = await buildProfileNamesFromProjectAsync(projectDir);
    const buildProfiles = new Map();
    for (const profileName of buildProfileNames) {
        const iosBuildProfile = (await getBuildProfileAsync(projectDir, eas_json_1.Platform.IOS, profileName));
        const androidBuildProfile = (await getBuildProfileAsync(projectDir, eas_json_1.Platform.ANDROID, profileName));
        buildProfiles.set(profileName, { android: androidBuildProfile, ios: iosBuildProfile });
    }
    return buildProfiles;
}
function isBuildProfileForDevelopment(buildProfile, platform) {
    if (buildProfile.developmentClient) {
        return true;
    }
    if (platform === eas_json_1.Platform.ANDROID) {
        return buildProfile.gradleCommand === ':app:assembleDebug';
    }
    if (platform === eas_json_1.Platform.IOS) {
        return buildProfile.buildConfiguration === 'Debug';
    }
    return false;
}
function isIosBuildProfileForSimulator(buildProfile) {
    return buildProfile.simulator ?? false;
}
async function addAndroidDevelopmentBuildProfileToEasJsonAsync(projectDir, buildProfileName) {
    const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
    await easJsonAccessor.readRawJsonAsync();
    easJsonAccessor.patch(easJsonRawObject => {
        easJsonRawObject.build = {
            ...easJsonRawObject.build,
            [buildProfileName]: {
                developmentClient: true,
                distribution: 'internal',
                android: {
                    gradleCommand: ':app:assembleDebug',
                },
            },
        };
        return easJsonRawObject;
    });
    await easJsonAccessor.writeAsync();
}
async function addIosDevelopmentBuildProfileToEasJsonAsync(projectDir, buildProfileName, simulator) {
    const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
    await easJsonAccessor.readRawJsonAsync();
    easJsonAccessor.patch(easJsonRawObject => {
        easJsonRawObject.build = {
            ...easJsonRawObject.build,
            [buildProfileName]: {
                developmentClient: true,
                distribution: 'internal',
                ios: {
                    buildConfiguration: 'Debug',
                    simulator,
                },
            },
        };
        return easJsonRawObject;
    });
    await easJsonAccessor.writeAsync();
}
async function addProductionBuildProfileToEasJsonIfNeededAsync(projectDir) {
    const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
    await easJsonAccessor.readRawJsonAsync();
    let profileAdded = false;
    easJsonAccessor.patch(easJsonRawObject => {
        if (!easJsonRawObject.build?.production) {
            profileAdded = true;
            easJsonRawObject.build = {
                ...(easJsonRawObject.build ?? {}),
                production: {},
            };
            // Also add the profile to submit
            easJsonRawObject.submit = {
                ...(easJsonRawObject.submit ?? {}),
                production: {},
            };
        }
        return easJsonRawObject;
    });
    if (profileAdded) {
        log_1.default.log('Added missing production build profile to eas.json');
    }
    await easJsonAccessor.writeAsync();
    return profileAdded;
}
async function hasBuildConfigureBeenRunAsync({ projectDir, expoConfig, }) {
    // Is there a project ID in the Expo config?
    if (!expoConfig.extra?.eas?.projectId) {
        return false;
    }
    // Is there an eas.json?
    const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
    try {
        await easJsonAccessor.readAsync();
    }
    catch {
        return false;
    }
    return true;
}
async function hasUpdateConfigureBeenRunAsync({ projectDir, expoConfig, }) {
    // Does the Expo config have an updates URL?
    if (!expoConfig.updates?.url) {
        return false;
    }
    // Does at least one build profile have a channel?
    const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
    try {
        const easJson = await easJsonAccessor.readAsync();
        return Object.values(easJson.build ?? {}).some(buildProfile => !!buildProfile.channel);
    }
    catch {
        return false;
    }
}
/**
 * Runs update:configure if needed. Returns a boolean (proceed with workflow creation, or not)
 */
async function runUpdateConfigureIfNeededAsync({ projectDir, expoConfig, }) {
    if (await hasUpdateConfigureBeenRunAsync({
        projectDir,
        expoConfig,
    })) {
        return true;
    }
    const nextStep = (await (0, prompts_1.promptAsync)({
        type: 'select',
        name: 'nextStep',
        message: 'You have chosen to create a workflow that requires EAS Update configuration. What would you like to do?',
        choices: [
            { title: 'Configure EAS Update and then proceed', value: 'configure' },
            { title: 'EAS Update is already configured, proceed', value: 'proceed' },
            { title: 'Choose a different workflow template', value: 'repeat' },
        ],
    })).nextStep;
    switch (nextStep) {
        case 'configure':
            log_1.default.newLine();
            await configure_2.default.run([]);
            return true;
        case 'proceed':
            return true;
        default:
            return false;
    }
}
/**
 * Runs build:configure if needed. Returns a boolean (proceed with workflow creation, or not)
 */
async function runBuildConfigureIfNeededAsync({ projectDir, expoConfig, }) {
    if (await hasBuildConfigureBeenRunAsync({
        projectDir,
        expoConfig,
    })) {
        return true;
    }
    const nextStep = (await (0, prompts_1.promptAsync)({
        type: 'select',
        name: 'nextStep',
        message: 'You have chosen to create a workflow that requires EAS Build configuration. What would you like to do?',
        choices: [
            { title: 'Configure EAS Build and then proceed', value: 'configure' },
            { title: 'EAS Build is already configured, proceed', value: 'proceed' },
            { title: 'Choose a different workflow template', value: 'repeat' },
        ],
    })).nextStep;
    switch (nextStep) {
        case 'configure':
            log_1.default.newLine();
            await configure_1.default.run(['-p', 'all']);
            return true;
        case 'proceed':
            return true;
        default:
            return false;
    }
}
