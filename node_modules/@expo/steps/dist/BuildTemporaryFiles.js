"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveScriptToTemporaryFileAsync = saveScriptToTemporaryFileAsync;
exports.cleanUpStepTemporaryDirectoriesAsync = cleanUpStepTemporaryDirectoriesAsync;
exports.getTemporaryOutputsDirPath = getTemporaryOutputsDirPath;
exports.getTemporaryEnvsDirPath = getTemporaryEnvsDirPath;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
async function saveScriptToTemporaryFileAsync(ctx, stepId, scriptContents) {
    const scriptsDir = getTemporaryScriptsDirPath(ctx, stepId);
    await promises_1.default.mkdir(scriptsDir, { recursive: true });
    const temporaryScriptPath = path_1.default.join(scriptsDir, `${(0, uuid_1.v4)()}.sh`);
    await promises_1.default.writeFile(temporaryScriptPath, scriptContents);
    return temporaryScriptPath;
}
async function cleanUpStepTemporaryDirectoriesAsync(ctx, stepId) {
    if (ctx.skipCleanup) {
        return;
    }
    const stepTemporaryDirectory = getTemporaryStepDirPath(ctx, stepId);
    await promises_1.default.rm(stepTemporaryDirectory, { recursive: true, force: true });
    ctx.baseLogger.debug({ stepTemporaryDirectory }, 'Removed step temporary directory');
}
function getTemporaryStepDirPath(ctx, stepId) {
    return path_1.default.join(ctx.stepsInternalBuildDirectory, 'steps', stepId);
}
function getTemporaryScriptsDirPath(ctx, stepId) {
    return path_1.default.join(getTemporaryStepDirPath(ctx, stepId), 'scripts');
}
function getTemporaryOutputsDirPath(ctx, stepId) {
    return path_1.default.join(getTemporaryStepDirPath(ctx, stepId), 'outputs');
}
function getTemporaryEnvsDirPath(ctx, stepId) {
    return path_1.default.join(getTemporaryStepDirPath(ctx, stepId), 'envs');
}
