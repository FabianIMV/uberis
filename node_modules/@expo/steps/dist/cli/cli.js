"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliContextProvider = void 0;
const logger_1 = require("@expo/logger");
const path_1 = __importDefault(require("path"));
const BuildConfigParser_1 = require("../BuildConfigParser");
const BuildStepContext_1 = require("../BuildStepContext");
const errors_1 = require("../errors");
const logger = (0, logger_1.createLogger)({
    name: 'steps-cli',
    level: 'info',
});
class CliContextProvider {
    logger;
    runtimePlatform;
    projectSourceDirectory;
    projectTargetDirectory;
    defaultWorkingDirectory;
    buildLogsDirectory;
    _env = {};
    constructor(logger, runtimePlatform, projectSourceDirectory, projectTargetDirectory, defaultWorkingDirectory, buildLogsDirectory) {
        this.logger = logger;
        this.runtimePlatform = runtimePlatform;
        this.projectSourceDirectory = projectSourceDirectory;
        this.projectTargetDirectory = projectTargetDirectory;
        this.defaultWorkingDirectory = defaultWorkingDirectory;
        this.buildLogsDirectory = buildLogsDirectory;
    }
    get env() {
        return this._env;
    }
    staticContext() {
        return {
            job: {},
            metadata: {},
            expoApiServerURL: 'http://api.expo.test',
        };
    }
    updateEnv(env) {
        this._env = env;
    }
}
exports.CliContextProvider = CliContextProvider;
async function runAsync(configPath, relativeProjectDirectory, runtimePlatform) {
    const ctx = new BuildStepContext_1.BuildStepGlobalContext(new CliContextProvider(logger, runtimePlatform, relativeProjectDirectory, relativeProjectDirectory, relativeProjectDirectory, relativeProjectDirectory), false);
    const parser = new BuildConfigParser_1.BuildConfigParser(ctx, {
        configPath,
    });
    const workflow = await parser.parseAsync();
    await workflow.executeAsync();
}
const relativeConfigPath = process.argv[2];
const relativeProjectDirectoryPath = process.argv[3];
const platform = (process.argv[4] ??
    process.platform);
if (!relativeConfigPath || !relativeProjectDirectoryPath) {
    console.error('Usage: yarn cli config.yml path/to/project/directory [darwin|linux]');
    process.exit(1);
}
const configPath = path_1.default.resolve(process.cwd(), relativeConfigPath);
const workingDirectory = path_1.default.resolve(process.cwd(), relativeProjectDirectoryPath);
runAsync(configPath, workingDirectory, platform).catch(err => {
    logger.error({ err }, 'Build failed');
    if (err instanceof errors_1.BuildWorkflowError) {
        logger.error('Failed to parse the custom build config file.');
        for (const detailedErr of err.errors) {
            logger.error({ err: detailedErr });
        }
    }
});
