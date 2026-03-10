"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagedApplicationTargetEntitlementsAsync = getManagedApplicationTargetEntitlementsAsync;
exports.getNativeTargetEntitlementsAsync = getNativeTargetEntitlementsAsync;
const tslib_1 = require("tslib");
const config_plugins_1 = require("@expo/config-plugins");
const prebuild_config_1 = require("@expo/prebuild-config");
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
const log_1 = tslib_1.__importDefault(require("../../log"));
const plist_1 = require("../../utils/plist");
const workflow_1 = require("../workflow");
let wasExpoConfigPluginsWarnPrinted = false;
async function getManagedApplicationTargetEntitlementsAsync(projectDir, env, vcsClient) {
    const originalProcessEnv = process.env;
    try {
        process.env = {
            ...process.env,
            ...env,
        };
        let expWithMods;
        try {
            const { stdout } = await (0, spawn_async_1.default)('npx', ['expo', 'config', '--json', '--type', 'introspect'], {
                cwd: projectDir,
                env: {
                    ...process.env,
                    ...env,
                    EXPO_NO_DOTENV: '1',
                },
            });
            expWithMods = JSON.parse(stdout);
        }
        catch (err) {
            if (!wasExpoConfigPluginsWarnPrinted) {
                log_1.default.warn(`Failed to read the app config from the project using "npx expo config" command: ${err.message}.`);
                log_1.default.warn('Falling back to the version of "@expo/config" shipped with the EAS CLI.');
                wasExpoConfigPluginsWarnPrinted = true;
            }
            const { exp } = await (0, prebuild_config_1.getPrebuildConfigAsync)(projectDir, { platforms: ['ios'] });
            expWithMods = await (0, config_plugins_1.compileModsAsync)(exp, {
                projectRoot: projectDir,
                platforms: ['ios'],
                introspect: true,
                ignoreExistingNativeFiles: await (0, workflow_1.hasIgnoredIosProjectAsync)(projectDir, vcsClient),
            });
        }
        return expWithMods.ios?.entitlements ?? {};
    }
    finally {
        process.env = originalProcessEnv;
    }
}
async function getNativeTargetEntitlementsAsync(projectDir, target) {
    const entitlementsPath = config_plugins_1.IOSConfig.Entitlements.getEntitlementsPath(projectDir, target);
    if (entitlementsPath) {
        const plist = await (0, plist_1.readPlistAsync)(entitlementsPath);
        return plist ? plist : null;
    }
    else {
        return null;
    }
}
