"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAsync = runAsync;
exports.getEasBuildRunCachedAppPath = getEasBuildRunCachedAppPath;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const run_1 = require("./android/run");
const run_2 = require("./ios/run");
const generated_1 = require("../graphql/generated");
const paths_1 = require("../utils/paths");
async function runAsync(simulatorBuildPath, selectedPlatform) {
    if (selectedPlatform === generated_1.AppPlatform.Ios) {
        await (0, run_2.runAppOnIosSimulatorAsync)(simulatorBuildPath);
    }
    else {
        await (0, run_1.runAppOnAndroidEmulatorAsync)(simulatorBuildPath);
    }
}
function getEasBuildRunCachedAppPath(projectId, buildId, platform) {
    return path_1.default.join((0, paths_1.getEasBuildRunCacheDirectoryPath)(), `${projectId}_${buildId}.${platform === generated_1.AppPlatform.Ios ? 'app' : 'apk'}`);
}
