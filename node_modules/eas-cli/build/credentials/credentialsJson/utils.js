"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredentialsJsonPath = getCredentialsJsonPath;
exports.ensureAllTargetsAreConfigured = ensureAllTargetsAreConfigured;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
function getCredentialsJsonPath(projectDir) {
    return path_1.default.join(projectDir, 'credentials.json');
}
function ensureAllTargetsAreConfigured(targets, credentialsJson) {
    const notConfiguredTargets = [];
    for (const target of targets) {
        if (!(target.targetName in credentialsJson)) {
            notConfiguredTargets.push(target.targetName);
            continue;
        }
    }
    if (notConfiguredTargets.length > 0) {
        const errorMessage = targets.length === 1
            ? 'Credentials are not defined in credentials.json'
            : `Credentials for target${notConfiguredTargets.length === 1 ? '' : 's'} ${notConfiguredTargets
                .map(i => `'${i}'`)
                .join(',')} are not defined in credentials.json`;
        throw new Error(errorMessage);
    }
}
