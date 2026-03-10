"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easJsonExistsAsync = easJsonExistsAsync;
exports.ensureProjectConfiguredAsync = ensureProjectConfiguredAsync;
exports.doesBuildProfileExistAsync = doesBuildProfileExistAsync;
exports.createBuildProfileAsync = createBuildProfileAsync;
const tslib_1 = require("tslib");
const eas_json_1 = require("@expo/eas-json");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const repository_1 = require("./utils/repository");
const log_1 = tslib_1.__importStar(require("../log"));
const ora_1 = require("../ora");
const easCli_1 = require("../utils/easCli");
async function easJsonExistsAsync(projectDir) {
    return await fs_extra_1.default.pathExists(eas_json_1.EasJsonAccessor.formatEasJsonPath(projectDir));
}
/**
 * Creates eas.json if it does not exist.
 *
 * Returns:
 * - false - if eas.json already exists
 * - true - if eas.json was created by the function
 */
async function ensureProjectConfiguredAsync(configureParams) {
    if (await easJsonExistsAsync(configureParams.projectDir)) {
        return false;
    }
    await configureAsync(configureParams);
    return true;
}
async function configureAsync({ projectDir, nonInteractive, vcsClient, }) {
    await (0, repository_1.maybeBailOnRepoStatusAsync)(vcsClient, nonInteractive);
    await createEasJsonAsync(projectDir, vcsClient);
    if (await vcsClient.isCommitRequiredAsync()) {
        log_1.default.newLine();
        await (0, repository_1.reviewAndCommitChangesAsync)(vcsClient, 'Configure EAS Build', {
            nonInteractive,
        });
    }
}
async function doesBuildProfileExistAsync({ projectDir, profileName, }) {
    try {
        const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
        const easJson = await easJsonAccessor.readRawJsonAsync();
        if (!easJson.build?.[profileName]) {
            return false;
        }
        return true;
    }
    catch (error) {
        log_1.default.error(`We were unable to read ${chalk_1.default.bold('eas.json')} contents. Error: ${error}.`);
        throw error;
    }
}
async function createBuildProfileAsync({ projectDir, profileName, profileContents, vcsClient, nonInteractive, }) {
    const spinner = (0, ora_1.ora)(`Adding "${profileName}" build profile to ${chalk_1.default.bold('eas.json')}`).start();
    try {
        const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
        await easJsonAccessor.readRawJsonAsync();
        easJsonAccessor.patch(easJsonRawObject => {
            return {
                ...easJsonRawObject,
                build: {
                    ...easJsonRawObject.build,
                    [profileName]: profileContents,
                },
            };
        });
        await easJsonAccessor.writeAsync();
        spinner.succeed(`Successfully added "${profileName}" build profile to ${chalk_1.default.bold('eas.json')}.`);
        if (await vcsClient.isCommitRequiredAsync()) {
            log_1.default.newLine();
            await (0, repository_1.reviewAndCommitChangesAsync)(vcsClient, `Add "${profileName}" build profile to eas.json`, {
                nonInteractive,
            });
        }
    }
    catch (error) {
        spinner.fail(`We were not able to configure "${profileName}" build profile inside of ${chalk_1.default.bold('eas.json')}. Error: ${error}.`);
        throw error;
    }
}
const EAS_JSON_DEFAULT = {
    cli: {
        version: `>= ${easCli_1.easCliVersion}`,
        appVersionSource: eas_json_1.AppVersionSource.REMOTE,
    },
    build: {
        development: {
            developmentClient: true,
            distribution: 'internal',
        },
        preview: {
            distribution: 'internal',
        },
        production: {
            autoIncrement: true,
        },
    },
    submit: {
        production: {},
    },
};
async function createEasJsonAsync(projectDir, vcsClient) {
    const easJsonPath = eas_json_1.EasJsonAccessor.formatEasJsonPath(projectDir);
    await fs_extra_1.default.writeFile(easJsonPath, `${JSON.stringify(EAS_JSON_DEFAULT, null, 2)}\n`);
    await vcsClient.trackFileAsync(easJsonPath);
    log_1.default.withTick(`Generated ${chalk_1.default.bold('eas.json')}. ${(0, log_1.learnMore)('https://docs.expo.dev/build-reference/eas-json/')}`);
}
