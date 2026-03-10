"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneTemplateAsync = cloneTemplateAsync;
exports.installProjectDependenciesAsync = installProjectDependenciesAsync;
exports.initializeGitRepositoryAsync = initializeGitRepositoryAsync;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("./utils");
const git_1 = require("../../onboarding/git");
const installDependencies_1 = require("../../onboarding/installDependencies");
const runCommand_1 = require("../../onboarding/runCommand");
const ora_1 = require("../../ora");
async function cloneTemplateAsync(targetProjectDir) {
    const githubUsername = 'expo';
    const githubRepositoryName = 'expo-template-default';
    const spinner = (0, ora_1.ora)(`${chalk_1.default.bold(`Cloning the project to ${(0, utils_1.printDirectory)(targetProjectDir)}`)}`).start();
    const cloneMethod = (await (0, git_1.canAccessRepositoryUsingSshAsync)({
        githubUsername,
        githubRepositoryName,
    }))
        ? 'ssh'
        : 'https';
    const { targetProjectDir: finalTargetProjectDirectory } = await (0, git_1.runGitCloneAsync)({
        githubUsername,
        githubRepositoryName,
        targetProjectDir,
        cloneMethod,
        showOutput: false,
    });
    spinner.succeed(`Cloned the project to ${(0, utils_1.printDirectory)(finalTargetProjectDirectory)}`);
    return finalTargetProjectDirectory;
}
async function installProjectDependenciesAsync(projectDir, packageManager) {
    const spinner = (0, ora_1.ora)(`${chalk_1.default.bold('Installing project dependencies')}`).start();
    await (0, installDependencies_1.installDependenciesAsync)({
        outputLevel: 'none',
        projectDir,
        packageManager,
    });
    const dependencies = ['expo-updates', '@expo/metro-runtime'];
    for (const dependency of dependencies) {
        spinner.text = `Installing ${chalk_1.default.bold(dependency)}`;
        await (0, runCommand_1.runCommandAsync)({
            cwd: projectDir,
            command: 'npx',
            args: ['expo', 'install', dependency],
            showOutput: false,
            showSpinner: false,
        });
    }
    spinner.succeed(`Installed project dependencies`);
}
async function initializeGitRepositoryAsync(projectDir) {
    const spinner = (0, ora_1.ora)(`${chalk_1.default.bold('Initializing Git repository')}`).start();
    await fs_extra_1.default.remove(path_1.default.join(projectDir, '.git'));
    const commands = [['init'], ['add', '.'], ['commit', '-m', 'Initial commit']];
    for (const args of commands) {
        await (0, runCommand_1.runCommandAsync)({
            cwd: projectDir,
            command: 'git',
            args,
            showOutput: false,
            showSpinner: false,
        });
    }
    spinner.succeed(`Initialized Git repository`);
}
