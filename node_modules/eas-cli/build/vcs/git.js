"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGitInstalledAsync = isGitInstalledAsync;
exports.doesGitRepoExistAsync = doesGitRepoExistAsync;
exports.gitStatusAsync = gitStatusAsync;
exports.getGitDiffOutputAsync = getGitDiffOutputAsync;
exports.gitDiffAsync = gitDiffAsync;
const tslib_1 = require("tslib");
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
async function isGitInstalledAsync() {
    try {
        await (0, spawn_async_1.default)('git', ['--help']);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
    return true;
}
async function doesGitRepoExistAsync(cwd) {
    try {
        await (0, spawn_async_1.default)('git', ['rev-parse', '--git-dir'], {
            cwd,
        });
        return true;
    }
    catch {
        return false;
    }
}
async function gitStatusAsync({ showUntracked, cwd }) {
    return (await (0, spawn_async_1.default)('git', ['status', '-s', showUntracked ? '-uall' : '-uno'], {
        cwd,
    })).stdout;
}
async function getGitDiffOutputAsync(cwd) {
    return (await (0, spawn_async_1.default)('git', ['--no-pager', 'diff'], {
        cwd,
    })).stdout;
}
async function gitDiffAsync({ withPager = false, cwd, }) {
    const options = withPager ? [] : ['--no-pager'];
    try {
        await (0, spawn_async_1.default)('git', [...options, 'diff'], {
            stdio: ['ignore', 'inherit', 'inherit'],
            cwd,
        });
    }
    catch (error) {
        if (typeof error.message === 'string' && error.message.includes('SIGPIPE')) {
            // This error is thrown when the user exits the pager with `q`.
            // do nothing
            return;
        }
        throw error;
    }
}
