"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishRollBackToEmbeddedUpdateAsync = publishRollBackToEmbeddedUpdateAsync;
const tslib_1 = require("tslib");
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const utils_1 = require("./utils");
const url_1 = require("../build/utils/url");
const fetch_1 = tslib_1.__importDefault(require("../fetch"));
const PublishMutation_1 = require("../graphql/mutations/PublishMutation");
const log_1 = tslib_1.__importStar(require("../log"));
const ora_1 = require("../ora");
const projectUtils_1 = require("../project/projectUtils");
const publish_1 = require("../project/publish");
const code_signing_1 = require("../utils/code-signing");
const uniqBy_1 = tslib_1.__importDefault(require("../utils/expodash/uniqBy"));
const formatFields_1 = tslib_1.__importDefault(require("../utils/formatFields"));
const json_1 = require("../utils/json");
async function publishRollBackToEmbeddedUpdateAsync({ graphqlClient, projectId, exp, updateMessage, branch, codeSigningInfo, platforms, runtimeVersion, json, }) {
    const runtimeToPlatformsAndFingerprintInfoMapping = (0, publish_1.getRuntimeToPlatformsAndFingerprintInfoMappingFromRuntimeVersionInfoObjects)(platforms.map(platform => ({
        platform,
        runtimeVersionInfo: {
            runtimeVersion,
            expoUpdatesRuntimeFingerprint: null,
            expoUpdatesRuntimeFingerprintHash: null,
        },
    })));
    let newUpdates;
    const publishSpinner = (0, ora_1.ora)('Publishing...').start();
    try {
        newUpdates = await publishRollbacksAsync({
            graphqlClient,
            updateMessage,
            branchId: branch.id,
            codeSigningInfo,
            runtimeToPlatformsAndFingerprintInfoMapping,
            platforms,
        });
        publishSpinner.succeed('Published!');
    }
    catch (e) {
        publishSpinner.fail('Failed to publish updates');
        throw e;
    }
    if (json) {
        (0, json_1.printJsonOnlyOutput)((0, utils_1.getUpdateJsonInfosForUpdates)(newUpdates));
    }
    else {
        log_1.default.addNewLineIfNone();
        for (const runtime of (0, uniqBy_1.default)(runtimeToPlatformsAndFingerprintInfoMapping, version => version.runtimeVersion)) {
            const newUpdatesForRuntimeVersion = newUpdates.filter(update => update.runtimeVersion === runtime.runtimeVersion);
            if (newUpdatesForRuntimeVersion.length === 0) {
                throw new Error(`Publish response is missing updates with runtime ${runtime.runtimeVersion}.`);
            }
            const platforms = newUpdatesForRuntimeVersion.map(update => update.platform);
            const newAndroidUpdate = newUpdatesForRuntimeVersion.find(update => update.platform === 'android');
            const newIosUpdate = newUpdatesForRuntimeVersion.find(update => update.platform === 'ios');
            const updateGroupId = newUpdatesForRuntimeVersion[0].group;
            const projectName = exp.slug;
            const accountName = (await (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(graphqlClient, projectId)).name;
            const updateGroupUrl = (0, url_1.getUpdateGroupUrl)(accountName, projectName, updateGroupId);
            const updateGroupLink = (0, log_1.link)(updateGroupUrl, { dim: false });
            log_1.default.log((0, formatFields_1.default)([
                { label: 'Branch', value: branch.name },
                { label: 'Runtime version', value: runtime.runtimeVersion },
                { label: 'Platform', value: platforms.join(', ') },
                { label: 'Update group ID', value: updateGroupId },
                ...(newAndroidUpdate ? [{ label: 'Android update ID', value: newAndroidUpdate.id }] : []),
                ...(newIosUpdate ? [{ label: 'iOS update ID', value: newIosUpdate.id }] : []),
                { label: 'Message', value: updateMessage ?? '' },
                { label: 'EAS Dashboard', value: updateGroupLink },
            ]));
            log_1.default.addNewLineIfNone();
        }
    }
}
async function publishRollbacksAsync({ graphqlClient, updateMessage, branchId, codeSigningInfo, runtimeToPlatformsAndFingerprintInfoMapping, platforms, }) {
    const rollbackInfoGroups = Object.fromEntries(platforms.map(platform => [platform, true]));
    // Sort the updates into different groups based on their platform specific runtime versions
    const updateGroups = runtimeToPlatformsAndFingerprintInfoMapping.map(({ runtimeVersion, platforms }) => {
        const localRollbackInfoGroup = Object.fromEntries(platforms.map(platform => [platform, rollbackInfoGroups[platform]]));
        return {
            branchId,
            rollBackToEmbeddedInfoGroup: localRollbackInfoGroup,
            runtimeVersion,
            message: updateMessage,
            awaitingCodeSigningInfo: !!codeSigningInfo,
        };
    });
    const newUpdates = await PublishMutation_1.PublishMutation.publishUpdateGroupAsync(graphqlClient, updateGroups);
    if (codeSigningInfo) {
        log_1.default.log('🔒 Signing roll back');
        const updatesTemp = [...newUpdates];
        const updateGroupsAndTheirUpdates = updateGroups.map(updateGroup => {
            const newUpdates = updatesTemp.splice(0, Object.keys((0, nullthrows_1.default)(updateGroup.rollBackToEmbeddedInfoGroup)).length);
            return {
                updateGroup,
                newUpdates,
            };
        });
        await Promise.all(updateGroupsAndTheirUpdates.map(async ({ newUpdates }) => {
            await Promise.all(newUpdates.map(async (newUpdate) => {
                const response = await (0, fetch_1.default)(newUpdate.manifestPermalink, {
                    method: 'GET',
                    headers: { accept: 'multipart/mixed' },
                });
                const directiveBody = (0, nullthrows_1.default)(await (0, code_signing_1.getDirectiveBodyAsync)(response));
                (0, code_signing_1.checkDirectiveBodyAgainstUpdateInfoGroup)(directiveBody);
                const directiveSignature = (0, code_signing_1.signBody)(directiveBody, codeSigningInfo);
                await PublishMutation_1.PublishMutation.setCodeSigningInfoAsync(graphqlClient, newUpdate.id, {
                    alg: codeSigningInfo.codeSigningMetadata.alg,
                    keyid: codeSigningInfo.codeSigningMetadata.keyid,
                    sig: directiveSignature,
                });
            }));
        }));
    }
    return newUpdates;
}
