"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrModifyExpoConfigAsync = createOrModifyExpoConfigAsync;
exports.getPrivateExpoConfigAsync = getPrivateExpoConfigAsync;
exports.ensureExpoConfigExists = ensureExpoConfigExists;
exports.isUsingStaticExpoConfig = isUsingStaticExpoConfig;
exports.getPublicExpoConfigAsync = getPublicExpoConfigAsync;
const tslib_1 = require("tslib");
const config_1 = require("@expo/config");
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const joi_1 = tslib_1.__importDefault(require("joi"));
const path_1 = tslib_1.__importDefault(require("path"));
const projectUtils_1 = require("./projectUtils");
const log_1 = tslib_1.__importDefault(require("../log"));
async function createOrModifyExpoConfigAsync(projectDir, exp, readOptions) {
    ensureExpoConfigExists(projectDir);
    if (readOptions) {
        return await (0, config_1.modifyConfigAsync)(projectDir, exp, readOptions);
    }
    else {
        return await (0, config_1.modifyConfigAsync)(projectDir, exp);
    }
}
let wasExpoConfigWarnPrinted = false;
async function getExpoConfigInternalAsync(projectDir, opts = {}) {
    const originalProcessEnv = process.env;
    try {
        process.env = {
            ...process.env,
            ...opts.env,
        };
        let exp;
        if ((0, projectUtils_1.isExpoInstalled)(projectDir)) {
            try {
                const { stdout } = await (0, spawn_async_1.default)('npx', ['expo', 'config', '--json', ...(opts.isPublicConfig ? ['--type', 'public'] : [])], {
                    cwd: projectDir,
                    env: {
                        ...process.env,
                        ...opts.env,
                        EXPO_NO_DOTENV: '1',
                    },
                });
                exp = JSON.parse(stdout);
            }
            catch (err) {
                if (!wasExpoConfigWarnPrinted) {
                    log_1.default.warn(`Failed to read the app config from the project using "npx expo config" command: ${err.message}.`);
                    log_1.default.warn('Falling back to the version of "@expo/config" shipped with the EAS CLI.');
                    wasExpoConfigWarnPrinted = true;
                }
                exp = (0, config_1.getConfig)(projectDir, {
                    skipSDKVersionRequirement: true,
                    ...(opts.isPublicConfig ? { isPublicConfig: true } : {}),
                    ...(opts.skipPlugins ? { skipPlugins: true } : {}),
                }).exp;
            }
        }
        else {
            exp = (0, config_1.getConfig)(projectDir, {
                skipSDKVersionRequirement: true,
                ...(opts.isPublicConfig ? { isPublicConfig: true } : {}),
                ...(opts.skipPlugins ? { skipPlugins: true } : {}),
            }).exp;
        }
        const { error } = MinimalAppConfigSchema.validate(exp, {
            allowUnknown: true,
            abortEarly: true,
        });
        if (error) {
            throw new Error(`Invalid app config.\n${error.message}`);
        }
        return exp;
    }
    finally {
        process.env = originalProcessEnv;
    }
}
const MinimalAppConfigSchema = joi_1.default.object({
    slug: joi_1.default.string().required(),
    name: joi_1.default.string().required(),
    version: joi_1.default.string(),
    android: joi_1.default.object({
        versionCode: joi_1.default.number().integer(),
    }),
    ios: joi_1.default.object({
        buildNumber: joi_1.default.string(),
    }),
});
async function getPrivateExpoConfigAsync(projectDir, opts = {}) {
    ensureExpoConfigExists(projectDir);
    return await getExpoConfigInternalAsync(projectDir, { ...opts, isPublicConfig: false });
}
function ensureExpoConfigExists(projectDir) {
    const paths = (0, config_1.getConfigFilePaths)(projectDir);
    if (!paths?.staticConfigPath && !paths?.dynamicConfigPath) {
        // eslint-disable-next-line node/no-sync
        fs_extra_1.default.writeFileSync(path_1.default.join(projectDir, 'app.json'), JSON.stringify({ expo: {} }, null, 2));
    }
}
function isUsingStaticExpoConfig(projectDir) {
    const paths = (0, config_1.getConfigFilePaths)(projectDir);
    return !!(paths.staticConfigPath?.endsWith('app.json') && !paths.dynamicConfigPath);
}
async function getPublicExpoConfigAsync(projectDir, opts = {}) {
    ensureExpoConfigExists(projectDir);
    return await getExpoConfigInternalAsync(projectDir, { ...opts, isPublicConfig: true });
}
