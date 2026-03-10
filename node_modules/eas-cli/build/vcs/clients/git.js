"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGitCaseSensitiveAsync = isGitCaseSensitiveAsync;
const tslib_1 = require("tslib");
const PackageManagerUtils = tslib_1.__importStar(require("@expo/package-manager"));
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const getenv_1 = tslib_1.__importDefault(require("getenv"));
const path_1 = tslib_1.__importDefault(require("path"));
const log_1 = tslib_1.__importStar(require("../../log"));
const ora_1 = require("../../ora");
const prompts_1 = require("../../prompts");
const git_1 = require("../git");
const local_1 = require("../local");
const vcs_1 = require("../vcs");
let hasWarnedAboutEasignoreInRequireCommit = false;
class GitClient extends vcs_1.Client {
    maybeCwdOverride;
    requireCommit;
    constructor(options) {
        super();
        this.maybeCwdOverride = options.maybeCwdOverride;
        this.requireCommit = options.requireCommit;
    }
    async ensureRepoExistsAsync() {
        try {
            if (!(await (0, git_1.isGitInstalledAsync)())) {
                log_1.default.error(`${chalk_1.default.bold('git')} command not found. Install it before proceeding or set ${chalk_1.default.bold('EAS_NO_VCS=1')} to use EAS CLI without Git (or any other version control system).`);
                log_1.default.error((0, log_1.learnMore)('https://expo.fyi/eas-vcs-workflow'));
                core_1.Errors.exit(1);
            }
        }
        catch (error) {
            log_1.default.error(`${chalk_1.default.bold('git')} found, but ${chalk_1.default.bold('git --help')} exited with status ${error?.status}${error?.stderr ? `:` : '.'}`);
            if (error?.stderr) {
                log_1.default.error(error?.stderr);
            }
            log_1.default.error(`Repair your Git installation, or set ${chalk_1.default.bold('EAS_NO_VCS=1')} to use EAS CLI without Git (or any other version control system).`);
            log_1.default.error((0, log_1.learnMore)('https://expo.fyi/eas-vcs-workflow'));
            core_1.Errors.exit(1);
        }
        if (await (0, git_1.doesGitRepoExistAsync)(this.maybeCwdOverride)) {
            return;
        }
        log_1.default.warn("It looks like you haven't initialized the git repository yet.");
        log_1.default.warn('EAS requires you to use a git repository for your project.');
        const cwd = process.cwd();
        const repoRoot = PackageManagerUtils.resolveWorkspaceRoot(cwd) ?? cwd;
        const confirmInit = await (0, prompts_1.confirmAsync)({
            message: `Would you like us to run 'git init' in ${this.maybeCwdOverride ?? repoRoot} for you?`,
        });
        if (!confirmInit) {
            throw new Error('A git repository is required for building your project. Initialize it and run this command again.');
        }
        await (0, spawn_async_1.default)('git', ['init'], { cwd: this.maybeCwdOverride ?? repoRoot });
        log_1.default.log("We're going to make an initial commit for your repository.");
        const { message } = await (0, prompts_1.promptAsync)({
            type: 'text',
            name: 'message',
            message: 'Commit message:',
            initial: 'Initial commit',
            validate: (input) => input !== '',
        });
        await this.commitAsync({ commitAllFiles: true, commitMessage: message, nonInteractive: false });
    }
    async commitAsync({ commitMessage, commitAllFiles, nonInteractive = false, }) {
        await this.ensureGitConfiguredAsync({ nonInteractive });
        try {
            if (commitAllFiles) {
                await (0, spawn_async_1.default)('git', ['add', '-A'], {
                    cwd: this.maybeCwdOverride,
                });
            }
            await (0, spawn_async_1.default)('git', ['add', '-u'], {
                cwd: this.maybeCwdOverride,
            });
            await (0, spawn_async_1.default)('git', ['commit', '-m', commitMessage], {
                cwd: this.maybeCwdOverride,
            });
        }
        catch (err) {
            if (err?.stdout) {
                log_1.default.error(err.stdout);
            }
            if (err?.stderr) {
                log_1.default.error(err.stderr);
            }
            throw err;
        }
    }
    async showChangedFilesAsync() {
        const gitStatusOutput = await (0, git_1.gitStatusAsync)({
            showUntracked: true,
            cwd: this.maybeCwdOverride,
        });
        log_1.default.log(gitStatusOutput);
    }
    async hasUncommittedChangesAsync() {
        const changes = await (0, git_1.gitStatusAsync)({ showUntracked: true, cwd: this.maybeCwdOverride });
        return changes.length > 0;
    }
    async getRootPathAsync() {
        return (await (0, spawn_async_1.default)('git', ['rev-parse', '--show-toplevel'], {
            cwd: this.maybeCwdOverride,
        })).stdout.trim();
    }
    async isCommitRequiredAsync() {
        if (!this.requireCommit) {
            return false;
        }
        return await this.hasUncommittedChangesAsync();
    }
    async makeShallowCopyAsync(destinationPath) {
        if (await this.isCommitRequiredAsync()) {
            // it should already be checked before this function is called, but in case it wasn't
            // we want to ensure that any changes were introduced by call to `setGitCaseSensitivityAsync`
            throw new Error('You have some uncommitted changes in your repository.');
        }
        const rootPath = await this.getRootPathAsync();
        const sourceEasignorePath = path_1.default.join(rootPath, local_1.EASIGNORE_FILENAME);
        const doesEasignoreExist = await fs_extra_1.default.exists(sourceEasignorePath);
        const shouldSuppressWarning = hasWarnedAboutEasignoreInRequireCommit ||
            getenv_1.default.boolish('EAS_SUPPRESS_REQUIRE_COMMIT_EASIGNORE_WARNING', false);
        if (this.requireCommit && doesEasignoreExist && !shouldSuppressWarning) {
            log_1.default.warn(`You have "requireCommit: true" in "eas.json" and also ".easignore". If ".easignore" does remove files, note that the repository checked out in EAS will not longer be Git-clean.`);
            hasWarnedAboutEasignoreInRequireCommit = true;
        }
        let gitRepoUri;
        if (process.platform === 'win32') {
            // getRootDirectoryAsync() will return C:/path/to/repo on Windows and path
            // prefix should be file:///
            gitRepoUri = `file:///${rootPath}`;
        }
        else {
            // getRootDirectoryAsync() will /path/to/repo, and path prefix should be
            // file:/// so only file:// needs to be prepended
            gitRepoUri = `file://${rootPath}`;
        }
        await assertEnablingGitCaseSensitivityDoesNotCauseNewUncommittedChangesAsync(rootPath);
        const isCaseSensitive = await isGitCaseSensitiveAsync(rootPath);
        try {
            await setGitCaseSensitivityAsync(true, rootPath);
            await (0, spawn_async_1.default)('git', [
                'clone',
                // If we do not require a commit, we are going to later
                // copy the working directory into the destination path,
                // so we can skip the checkout step (which also adds files
                // that have been removed in the working directory).
                this.requireCommit ? null : '--no-checkout',
                '--no-hardlinks',
                '--depth',
                '1',
                gitRepoUri,
                destinationPath,
            ].flatMap(e => e ?? []), { cwd: rootPath });
            const sourceEasignorePath = path_1.default.join(rootPath, local_1.EASIGNORE_FILENAME);
            if (await fs_extra_1.default.exists(sourceEasignorePath)) {
                log_1.default.debug('.easignore exists, deleting files that should be ignored', {
                    sourceEasignorePath,
                });
                const cachedFilesWeShouldHaveIgnored = (await (0, spawn_async_1.default)('git', [
                    'ls-files',
                    '--exclude-from',
                    sourceEasignorePath,
                    // `--ignored --cached` makes git print files that should be
                    // ignored by rules from `--exclude-from`, but instead are currently cached.
                    '--ignored',
                    '--cached',
                    // separates file names with null characters
                    '-z',
                ], { cwd: destinationPath })).stdout
                    .split('\0')
                    // ls-files' output is terminated by a null character
                    .filter(file => file !== '');
                log_1.default.debug('cachedFilesWeShouldHaveIgnored', {
                    cachedFilesWeShouldHaveIgnored,
                });
                await Promise.all(cachedFilesWeShouldHaveIgnored.map(file => 
                // `ls-files` does not go over files within submodules. If submodule is
                // ignored, it is listed as a single path, so we need to `rm -rf` it.
                fs_extra_1.default.rm(path_1.default.join(destinationPath, file), { recursive: true, force: true })));
                // Special-case `.git` which `git ls-files` will never consider ignored.
                // We don't want to ignore anything by default. We want to know what does
                // the user want to ignore.
                const ignore = await local_1.Ignore.createForCheckingAsync(rootPath);
                if (ignore.ignores('.git')) {
                    await fs_extra_1.default.rm(path_1.default.join(destinationPath, '.git'), { recursive: true, force: true });
                    log_1.default.debug('deleted .git', {
                        destinationPath,
                    });
                }
            }
        }
        finally {
            await setGitCaseSensitivityAsync(isCaseSensitive, rootPath);
        }
        if (!this.requireCommit) {
            log_1.default.debug('making shallow copy', { requireCommit: this.requireCommit });
            // After we create the shallow Git copy, we copy the files
            // again. This way we include the changed and untracked files
            // (`git clone` only copies the committed changes).
            //
            // We only do this if `requireCommit` is false because `requireCommit: true`
            // setups expect no changes in files (e.g. locked files should remain locked).
            await (0, local_1.makeShallowCopyAsync)(rootPath, destinationPath);
        }
        else {
            log_1.default.debug('not making shallow copy', { requireCommit: this.requireCommit });
        }
    }
    async getCommitHashAsync() {
        try {
            return (await (0, spawn_async_1.default)('git', ['rev-parse', 'HEAD'], {
                cwd: this.maybeCwdOverride,
            })).stdout.trim();
        }
        catch {
            return undefined;
        }
    }
    async trackFileAsync(file) {
        await (0, spawn_async_1.default)('git', ['add', '--intent-to-add', file], {
            cwd: this.maybeCwdOverride,
        });
    }
    async getBranchNameAsync() {
        try {
            return (await (0, spawn_async_1.default)('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
                cwd: this.maybeCwdOverride,
            })).stdout.trim();
        }
        catch {
            return null;
        }
    }
    async getLastCommitMessageAsync() {
        try {
            return (await (0, spawn_async_1.default)('git', ['--no-pager', 'log', '-1', '--pretty=%B'], {
                cwd: this.maybeCwdOverride,
            })).stdout.trim();
        }
        catch {
            return null;
        }
    }
    async showDiffAsync() {
        const outputTooLarge = (await (0, git_1.getGitDiffOutputAsync)(this.maybeCwdOverride)).split(/\r\n|\r|\n/).length > 100;
        await (0, git_1.gitDiffAsync)({ withPager: outputTooLarge, cwd: this.maybeCwdOverride });
    }
    async isFileUntrackedAsync(path) {
        const withUntrackedFiles = await (0, git_1.gitStatusAsync)({
            showUntracked: true,
            cwd: this.maybeCwdOverride,
        });
        const trackedFiles = await (0, git_1.gitStatusAsync)({ showUntracked: false, cwd: this.maybeCwdOverride });
        const pathWithoutLeadingDot = path.replace(/^\.\//, ''); // remove leading './' from path
        return (withUntrackedFiles.includes(pathWithoutLeadingDot) &&
            !trackedFiles.includes(pathWithoutLeadingDot));
    }
    /** NOTE: This method does not support checking whether `.git` is ignored by `.easignore` rules. */
    async isFileIgnoredAsync(filePath) {
        const rootPath = await this.getRootPathAsync();
        let isTracked;
        try {
            await (0, spawn_async_1.default)('git', ['ls-files', '--error-unmatch', filePath], {
                cwd: rootPath,
            });
            isTracked = true;
        }
        catch {
            isTracked = false;
        }
        const easIgnorePath = path_1.default.join(rootPath, local_1.EASIGNORE_FILENAME);
        if (await fs_extra_1.default.exists(easIgnorePath)) {
            const ignore = await local_1.Ignore.createForCheckingAsync(rootPath);
            const wouldNotBeCopiedToClone = ignore.ignores(filePath);
            const wouldBeDeletedFromClone = (await (0, spawn_async_1.default)('git', ['ls-files', '--exclude-from', easIgnorePath, '--ignored', '--cached', filePath], { cwd: rootPath })).stdout.trim() !== '';
            // File is considered ignored if:
            // - makeShallowCopyAsync() will not copy it to the clone
            // AND
            // - it will not be copied to the clone because it's not tracked
            // - or it will get copied to the clone, but then will be deleted by .easignore rules
            return wouldNotBeCopiedToClone && (!isTracked || wouldBeDeletedFromClone);
        }
        if (isTracked) {
            return false; // Tracked files aren't ignored even if they match ignore patterns
        }
        try {
            await (0, spawn_async_1.default)('git', ['check-ignore', '-q', filePath], { cwd: rootPath });
            return true;
        }
        catch {
            return false;
        }
    }
    canGetLastCommitMessage() {
        return true;
    }
    async ensureGitConfiguredAsync({ nonInteractive, }) {
        let usernameConfigured = true;
        let emailConfigured = true;
        try {
            await (0, spawn_async_1.default)('git', ['config', '--get', 'user.name'], {
                cwd: this.maybeCwdOverride,
            });
        }
        catch (err) {
            log_1.default.debug(err);
            usernameConfigured = false;
        }
        try {
            await (0, spawn_async_1.default)('git', ['config', '--get', 'user.email'], {
                cwd: this.maybeCwdOverride,
            });
        }
        catch (err) {
            log_1.default.debug(err);
            emailConfigured = false;
        }
        if (usernameConfigured && emailConfigured) {
            return;
        }
        log_1.default.warn(`You need to configure Git with your ${[
            !usernameConfigured && 'username (user.name)',
            !emailConfigured && 'email address (user.email)',
        ]
            .filter(i => i)
            .join(' and ')}`);
        if (nonInteractive) {
            throw new Error('Git cannot be configured automatically in non-interactive mode');
        }
        if (!usernameConfigured) {
            const { username } = await (0, prompts_1.promptAsync)({
                type: 'text',
                name: 'username',
                message: 'Username:',
                validate: (input) => input !== '',
            });
            const spinner = (0, ora_1.ora)(`Running ${chalk_1.default.bold(`git config --local user.name ${username}`)}`).start();
            try {
                await (0, spawn_async_1.default)('git', ['config', '--local', 'user.name', username], {
                    cwd: this.maybeCwdOverride,
                });
                spinner.succeed();
            }
            catch (err) {
                spinner.fail();
                throw err;
            }
        }
        if (!emailConfigured) {
            const { email } = await (0, prompts_1.promptAsync)({
                type: 'text',
                name: 'email',
                message: 'Email address:',
                validate: (input) => input !== '',
            });
            const spinner = (0, ora_1.ora)(`Running ${chalk_1.default.bold(`git config --local user.email ${email}`)}`).start();
            try {
                await (0, spawn_async_1.default)('git', ['config', '--local', 'user.email', email], {
                    cwd: this.maybeCwdOverride,
                });
                spinner.succeed();
            }
            catch (err) {
                spinner.fail();
                throw err;
            }
        }
    }
}
exports.default = GitClient;
/**
 * Checks if git is configured to be case sensitive
 * @returns {boolean | undefined}
 *    - boolean - is git case sensitive
 *    - undefined - case sensitivity is not configured and git is using default behavior
 */
async function isGitCaseSensitiveAsync(cwd) {
    if (process.platform !== 'darwin') {
        return undefined;
    }
    try {
        const result = await (0, spawn_async_1.default)('git', ['config', '--get', 'core.ignorecase'], {
            cwd,
        });
        const isIgnoreCaseEnabled = result.stdout.trim();
        if (isIgnoreCaseEnabled === '') {
            return undefined;
        }
        else if (isIgnoreCaseEnabled === 'true') {
            return false;
        }
        else {
            return true;
        }
    }
    catch {
        return undefined;
    }
}
async function setGitCaseSensitivityAsync(enable, cwd) {
    // we are assuming that if someone sets that on non-macos device then
    // they know what they are doing
    if (process.platform !== 'darwin') {
        return;
    }
    if (enable === undefined) {
        await (0, spawn_async_1.default)('git', ['config', '--unset', 'core.ignorecase'], {
            cwd,
        });
    }
    else {
        await (0, spawn_async_1.default)('git', ['config', 'core.ignorecase', String(!enable)], {
            cwd,
        });
    }
}
async function assertEnablingGitCaseSensitivityDoesNotCauseNewUncommittedChangesAsync(cwd) {
    // Remember uncommited changes before case sensitivity change
    // for later comparison so we log to the user only the files
    // that were marked as changed after the case sensitivity change.
    const uncommittedChangesBeforeCaseSensitivityChange = await (0, git_1.gitStatusAsync)({
        showUntracked: true,
        cwd,
    });
    const isCaseSensitive = await isGitCaseSensitiveAsync(cwd);
    await setGitCaseSensitivityAsync(true, cwd);
    try {
        const uncommitedChangesAfterCaseSensitivityChange = await (0, git_1.gitStatusAsync)({
            showUntracked: true,
            cwd,
        });
        if (uncommitedChangesAfterCaseSensitivityChange !== uncommittedChangesBeforeCaseSensitivityChange) {
            const baseUncommitedChangesSet = new Set(uncommittedChangesBeforeCaseSensitivityChange.split('\n'));
            const errorMessage = [
                'Detected inconsistent filename casing between your local filesystem and git.',
                'This will likely cause your job to fail. Impacted files:',
                ...uncommitedChangesAfterCaseSensitivityChange.split('\n').flatMap(changedFile => {
                    // This file was changed before the case sensitivity change too.
                    if (baseUncommitedChangesSet.has(changedFile)) {
                        return [];
                    }
                    return [changedFile];
                }),
                `Resolve filename casing inconsistencies before proceeding. ${(0, log_1.learnMore)('https://expo.fyi/macos-ignorecase')}`,
            ];
            throw new Error(errorMessage.join('\n'));
        }
    }
    finally {
        await setGitCaseSensitivityAsync(isCaseSensitive, cwd);
    }
}
