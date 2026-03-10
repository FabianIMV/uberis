"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProjectConfigAsync = generateProjectConfigAsync;
exports.promptForProjectAccountAsync = promptForProjectAccountAsync;
exports.getAccountChoices = getAccountChoices;
exports.findAvailableProjectNameAsync = findAvailableProjectNameAsync;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const nanoid_1 = require("nanoid");
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("./utils");
const generated_1 = require("../../graphql/generated");
const log_1 = tslib_1.__importDefault(require("../../log"));
const fetchOrCreateProjectIDForWriteToConfigWithConfirmationAsync_1 = require("../../project/fetchOrCreateProjectIDForWriteToConfigWithConfirmationAsync");
const prompts_1 = require("../../prompts");
function validateProjectPath(resolvedPath) {
    const normalizedPath = path_1.default.normalize(resolvedPath);
    // Check for path traversal attempts
    if (normalizedPath.includes('..')) {
        throw new Error(`Invalid project path: "${resolvedPath}". Path traversal is not allowed.`);
    }
    // Ensure we're not trying to create a project in system directories
    const systemDirs = ['/bin', '/sbin', '/etc', '/usr', '/var', '/sys', '/proc', '/dev'];
    const isSystemDir = systemDirs.some(dir => normalizedPath === dir || normalizedPath.startsWith(dir + path_1.default.sep));
    if (isSystemDir) {
        throw new Error(`Invalid project path: "${resolvedPath}". Cannot create projects in system directories.`);
    }
}
async function generateProjectConfigAsync(pathArg, options) {
    let baseName = 'expo-project';
    let parentDirectory = process.cwd();
    if (pathArg) {
        const resolvedPath = path_1.default.isAbsolute(pathArg) ? pathArg : path_1.default.resolve(process.cwd(), pathArg);
        validateProjectPath(resolvedPath);
        baseName = path_1.default.basename(resolvedPath);
        parentDirectory = path_1.default.dirname(resolvedPath);
    }
    else {
        baseName = (await (0, prompts_1.promptAsync)({
            type: 'text',
            name: 'name',
            message: 'What would you like to name your project?',
            initial: 'expo-project',
        })).name;
    }
    // Find an available name checking both local filesystem and remote server
    const { projectName, projectDirectory } = await findAvailableProjectNameAsync(baseName, parentDirectory, options);
    log_1.default.withInfo(`Using project name: ${projectName}`);
    log_1.default.withInfo(`Using project directory: ${(0, utils_1.printDirectory)(projectDirectory)}`);
    return {
        projectName,
        projectDirectory,
    };
}
function getAccountPermissionsMap(actor) {
    const permissionsMap = new Map();
    for (const account of actor.accounts) {
        const hasPermission = account.users.find(it => it.actor.id === actor.id)?.role !== generated_1.Role.ViewOnly;
        permissionsMap.set(account.name, hasPermission);
    }
    return permissionsMap;
}
async function promptForProjectAccountAsync(actor) {
    const permissionsMap = getAccountPermissionsMap(actor);
    // If only one account, use it (if has permissions)
    if (actor.accounts.length === 1) {
        const account = actor.accounts[0];
        if (permissionsMap.get(account.name)) {
            return account.name;
        }
        throw new Error(`You don't have permission to create projects on your only available account (${account.name}).`);
    }
    // Multiple accounts - prompt user to select one with permissions
    return (await (0, prompts_1.promptAsync)({
        type: 'select',
        name: 'account',
        message: 'Which account should own this project?',
        choices: getAccountChoices(actor, permissionsMap),
    })).account.name;
}
function getAccountChoices(actor, permissionsMap) {
    const permissions = permissionsMap ?? getAccountPermissionsMap(actor);
    const sortedAccounts = [...actor.accounts].sort((a, _b) => (a.ownerUserActor ? 1 : -1));
    return sortedAccounts.map(account => {
        const isPersonalAccount = !!account.ownerUserActor && account.ownerUserActor.id === actor.id;
        const isTeamAccount = !!account.ownerUserActor && account.ownerUserActor.id !== actor.id;
        const accountDisplayName = isPersonalAccount
            ? `${account.name} (Limited - Personal Account)`
            : isTeamAccount
                ? `${account.name} (Limited - Team Account)`
                : account.name;
        const disabled = !permissions.get(account.name);
        return {
            title: accountDisplayName,
            value: { name: account.name },
            ...(disabled && {
                disabled: true,
                description: 'You do not have the required permissions to create projects on this account.',
            }),
        };
    });
}
async function verifyProjectDoesNotExistAsync(graphqlClient, accountName, projectName, { silent = false } = {}) {
    const existingProjectId = await (0, fetchOrCreateProjectIDForWriteToConfigWithConfirmationAsync_1.findProjectIdByAccountNameAndSlugNullableAsync)(graphqlClient, accountName, projectName);
    const doesNotExist = existingProjectId === null;
    if (!doesNotExist && !silent) {
        log_1.default.warn(`Project @${accountName}/${projectName} already exists on the server.`);
    }
    return doesNotExist;
}
/**
 * Finds an available project name that doesn't conflict with either:
 * Local filesystem (directory already exists)
 * Remote server (project already exists on Expo)
 */
async function findAvailableProjectNameAsync(baseName, parentDirectory, { graphqlClient, projectAccount, }) {
    let projectName = baseName;
    let projectDirectory = path_1.default.join(parentDirectory, projectName);
    const localExists = await fs_extra_1.default.pathExists(projectDirectory);
    const remoteAvailable = await verifyProjectDoesNotExistAsync(graphqlClient, projectAccount, projectName);
    if (localExists || !remoteAvailable) {
        projectName = `${baseName}-${(0, nanoid_1.nanoid)(6)}`;
        projectDirectory = path_1.default.join(parentDirectory, projectName);
    }
    return {
        projectName,
        projectDirectory,
    };
}
