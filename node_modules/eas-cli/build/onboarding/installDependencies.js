"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PACKAGE_MANAGERS = void 0;
exports.promptForPackageManagerAsync = promptForPackageManagerAsync;
exports.installDependenciesAsync = installDependenciesAsync;
const runCommand_1 = require("./runCommand");
const prompts_1 = require("../prompts");
exports.PACKAGE_MANAGERS = ['bun', 'npm', 'pnpm', 'yarn'];
async function promptForPackageManagerAsync() {
    return await (0, prompts_1.selectAsync)('Which package manager would you like to use?', ['bun', 'npm', 'pnpm', 'yarn'].map(manager => ({ title: manager, value: manager })), { initial: 'npm' });
}
async function installDependenciesAsync({ outputLevel = 'default', projectDir, packageManager = 'npm', }) {
    await (0, runCommand_1.runCommandAsync)({
        command: packageManager,
        args: ['install'],
        cwd: projectDir,
        shouldShowStderrLine: line => {
            return (!line.includes('WARN') &&
                !line.includes('deprecated') &&
                !line.includes('no longer maintained') &&
                !line.includes('has been moved') &&
                !(line === packageManager));
        },
        showOutput: outputLevel !== 'none',
        showSpinner: outputLevel !== 'none',
    });
}
