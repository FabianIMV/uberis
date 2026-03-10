"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
const path_1 = tslib_1.__importDefault(require("path"));
const log_1 = tslib_1.__importDefault(require("../../log"));
const local_1 = require("../local");
const vcs_1 = require("../vcs");
let hasWarnedAboutEasProjectRoot = false;
class NoVcsClient extends vcs_1.Client {
    cwdOverride;
    constructor(options = {}) {
        super();
        this.cwdOverride = options.cwdOverride;
    }
    async getRootPathAsync() {
        // If EAS_PROJECT_ROOT is absolute, return it.
        // If it is relative or empty, resolve it from Git root or process.cwd().
        // Honor `EAS_PROJECT_ROOT` if it is set.
        if (process.env.EAS_PROJECT_ROOT && path_1.default.isAbsolute(process.env.EAS_PROJECT_ROOT)) {
            return path_1.default.normalize(process.env.EAS_PROJECT_ROOT);
        }
        // If `EAS_PROJECT_ROOT` is not set, try to get the root path from Git.
        try {
            return (await (0, spawn_async_1.default)('git', ['rev-parse', '--show-toplevel'], {
                cwd: this.cwdOverride,
            })).stdout.trim();
        }
        catch (err) {
            if (!hasWarnedAboutEasProjectRoot) {
                log_1.default.warn(`Failed to get Git root path with \`git rev-parse --show-toplevel\`.`, err);
                log_1.default.warn('Falling back to using current working directory as project root.');
                log_1.default.warn('You can set `EAS_PROJECT_ROOT` environment variable to let eas-cli know where your project is located.');
                hasWarnedAboutEasProjectRoot = true;
            }
        }
        return path_1.default.resolve(process.cwd(), process.env.EAS_PROJECT_ROOT ?? '.');
    }
    async makeShallowCopyAsync(destinationPath) {
        const srcPath = path_1.default.normalize(await this.getRootPathAsync());
        await (0, local_1.makeShallowCopyAsync)(srcPath, destinationPath);
    }
    async isFileIgnoredAsync(filePath) {
        const rootPath = path_1.default.normalize(await this.getRootPathAsync());
        const ignore = await local_1.Ignore.createForCheckingAsync(rootPath);
        return ignore.ignores(filePath);
    }
    canGetLastCommitMessage() {
        return false;
    }
}
exports.default = NoVcsClient;
