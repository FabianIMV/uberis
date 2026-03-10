"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nonNullish = nonNullish;
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const assert_1 = tslib_1.__importDefault(require("assert"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const log_1 = tslib_1.__importStar(require("../../log"));
const projectUtils_1 = require("../../project/projectUtils");
const publish_1 = require("../../project/publish");
const prompts_1 = require("../../prompts");
const delete_1 = require("../../update/delete");
const republish_1 = require("../../update/republish");
const roll_back_to_embedded_1 = require("../../update/roll-back-to-embedded");
const code_signing_1 = require("../../utils/code-signing");
const json_1 = require("../../utils/json");
const pollForBackgroundJobReceiptAsync_1 = require("../../utils/pollForBackgroundJobReceiptAsync");
function nonNullish(value) {
    return value !== null && value !== undefined;
}
class UpdateRevertUpdateRollout extends EasCommand_1.default {
    static description = 'revert a rollout update for a project';
    static flags = {
        channel: core_1.Flags.string({
            description: 'Channel name to select an update group to revert the rollout update from',
            exclusive: ['branch', 'group'],
        }),
        branch: core_1.Flags.string({
            description: 'Branch name to select an update group to revert the rollout update from',
            exclusive: ['channel', 'group'],
        }),
        group: core_1.Flags.string({
            description: 'Rollout update group ID to revert',
            exclusive: ['branch', 'channel'],
        }),
        message: core_1.Flags.string({
            char: 'm',
            description: 'Short message describing the revert',
            required: false,
        }),
        'private-key-path': core_1.Flags.string({
            description: `File containing the PEM-encoded private key corresponding to the certificate in expo-updates' configuration. Defaults to a file named "private-key.pem" in the certificate's directory. Only relevant if you are using code signing: https://docs.expo.dev/eas-update/code-signing/`,
            required: false,
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectConfig,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        const { flags: rawFlags } = await this.parse(UpdateRevertUpdateRollout);
        const flags = this.sanitizeFlags(rawFlags);
        const { privateProjectConfig: { exp, projectId, projectDir }, loggedIn: { graphqlClient }, vcsClient, } = await this.getContextAsync(UpdateRevertUpdateRollout, {
            nonInteractive: flags.nonInteractive,
            withServerSideEnvironment: null,
        });
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const codeSigningInfo = await (0, code_signing_1.getCodeSigningInfoAsync)(exp, flags.privateKeyPath);
        let updateGroupToRepublish;
        if (flags.groupId) {
            const updateGroup = await (0, republish_1.getUpdateGroupAsync)(graphqlClient, flags.groupId);
            if (!updateGroupIsRolloutUpdateGroup(updateGroup)) {
                throw new Error(`The update group with ID "${flags.groupId}" is not a rollout update group.`);
            }
            updateGroupToRepublish = updateGroup;
        }
        else {
            const latestUpdateGroupForEachPublishPlatform = await (0, republish_1.askUpdateGroupForEachPublishPlatformFilteringByRuntimeVersionAsync)(graphqlClient, projectId, flags);
            const uniqueUpdateGroups = getUniqueUpdateGroups(Object.values(latestUpdateGroupForEachPublishPlatform).filter(nonNullish));
            const rolloutUpdateGroups = uniqueUpdateGroups.filter(updateGroupIsRolloutUpdateGroup);
            if (rolloutUpdateGroups.length === 0) {
                throw new Error(`No rollout update groups found.`);
            }
            if (rolloutUpdateGroups.length === 1) {
                updateGroupToRepublish = rolloutUpdateGroups[0];
            }
            else {
                const { choice: chosenId } = await (0, prompts_1.promptAsync)({
                    type: 'select',
                    message: 'Which rollout update group would you like to revert?',
                    name: 'choice',
                    choices: rolloutUpdateGroups.map(ug => ({
                        title: `Rollout update group ID: ${ug[0].groupId}, Platform: ${ug[0].platform}, Rollout Percentage: ${ug[0].rolloutPercentage}`,
                        value: ug[0].groupId,
                    })),
                });
                if (!chosenId) {
                    throw new Error('No rollout update group selected.');
                }
                const chosenUpdateGroup = rolloutUpdateGroups.find(ug => ug[0].groupId === chosenId);
                if (!chosenUpdateGroup) {
                    throw new Error('No rollout update group selected.');
                }
                updateGroupToRepublish = chosenUpdateGroup;
            }
        }
        const rolloutUpdateGroupWithControlUpdates = updateGroupIsUpdateGroupWithControlUpdate(updateGroupToRepublish)
            ? updateGroupToRepublish
            : null;
        if (rolloutUpdateGroupWithControlUpdates) {
            await this.deleteRolloutUpdateGroupAndRepublishControlUpdatesAsync({
                graphqlClient,
                exp,
                projectId,
                rolloutUpdateGroupWithControlUpdates,
                codeSigningInfo,
                flags,
            });
        }
        else {
            await this.deleteRolloutUpdateGroupAndPublishRollBackToEmbeddedAsync({
                graphqlClient,
                vcsClient,
                exp,
                projectDir,
                projectId,
                rolloutUpdateGroup: updateGroupToRepublish,
                codeSigningInfo,
                flags,
            });
        }
    }
    async deleteRolloutUpdateGroupAndRepublishControlUpdatesAsync({ graphqlClient, exp, projectId, rolloutUpdateGroupWithControlUpdates, codeSigningInfo, flags, }) {
        const controlUpdateGroupIdsToRepublish = Array.from(new Set(rolloutUpdateGroupWithControlUpdates.map(update => update.rolloutControlUpdate.group)));
        const updateGroupsToRepublish = await Promise.all(controlUpdateGroupIdsToRepublish.map(controlUpdateGroupIdToRepublish => (0, republish_1.getUpdateGroupAsync)(graphqlClient, controlUpdateGroupIdToRepublish)));
        const updateGroupOrGroupsClause = controlUpdateGroupIdsToRepublish.length > 1
            ? `control update groups (IDs: ${controlUpdateGroupIdsToRepublish
                .map(id => `"${id}"`)
                .join(', ')})`
            : `control update group (ID: "${controlUpdateGroupIdsToRepublish[0]}")`;
        if (!flags.nonInteractive) {
            const confirmMessage = `Are you sure you want to revert the rollout update group with ID "${rolloutUpdateGroupWithControlUpdates[0].groupId}"? This will delete the rollout update group and republish the ${updateGroupOrGroupsClause}.`;
            const didConfirm = await (0, prompts_1.confirmAsync)({ message: confirmMessage });
            if (!didConfirm) {
                throw new Error('Aborting...');
            }
        }
        const updateMessages = [];
        for (const updateGroup of updateGroupsToRepublish) {
            updateMessages.push(await (0, republish_1.getOrAskUpdateMessageAsync)(updateGroup, flags));
        }
        // assert all updateGroupsToRepublish have the same branch name and id
        const branchNames = updateGroupsToRepublish.flatMap(updateGroup => updateGroup[0].branchName);
        const branchIds = updateGroupsToRepublish.map(updateGroup => updateGroup[0].branchId);
        (0, assert_1.default)(branchNames.every(name => name === branchNames[0]), 'All update groups being republished must belong to the same branch.');
        (0, assert_1.default)(branchIds.every(id => id === branchIds[0]), 'All update groups being republished must belong to the same branch.');
        const targetBranch = {
            branchName: branchNames[0],
            branchId: branchIds[0],
        };
        await this.deleteRolloutUpdateGroupAsync({
            graphqlClient,
            rolloutUpdateGroup: rolloutUpdateGroupWithControlUpdates,
        });
        for (let i = 0; i < updateGroupsToRepublish.length; i++) {
            const updateGroupToRepublish = updateGroupsToRepublish[i];
            const updateMessage = updateMessages[i];
            await (0, republish_1.republishAsync)({
                graphqlClient,
                app: { exp, projectId },
                updatesToPublish: updateGroupToRepublish,
                targetBranch,
                updateMessage,
                codeSigningInfo,
                json: flags.json,
            });
        }
    }
    async deleteRolloutUpdateGroupAndPublishRollBackToEmbeddedAsync({ graphqlClient, vcsClient, exp, projectDir, projectId, rolloutUpdateGroup, codeSigningInfo, flags, }) {
        const rolloutUpdateGroupId = rolloutUpdateGroup[0].groupId;
        if (!flags.nonInteractive) {
            const confirmMessage = `Are you sure you want to revert the rollout update group with ID "${rolloutUpdateGroupId}"? This will delete the rollout update group and publish a new roll-back-to-embedded update (no control update to roll back to), whose behavior may not be a true revert depending on the previous state of the branch. ${(0, log_1.learnMore)('https://expo.fyi/eas-update-update-rollouts', { learnMoreMessage: 'More info' })})`;
            const didConfirm = await (0, prompts_1.confirmAsync)({ message: confirmMessage });
            if (!didConfirm) {
                throw new Error('Aborting...');
            }
        }
        // check that the expo-updates package version supports roll back to embedded
        await (0, projectUtils_1.enforceRollBackToEmbeddedUpdateSupportAsync)(projectDir);
        const updateMessage = await (0, publish_1.getUpdateMessageForCommandAsync)(vcsClient, {
            updateMessageArg: flags.updateMessage,
            autoFlag: false,
            nonInteractive: flags.nonInteractive,
            jsonFlag: flags.json,
        });
        await this.deleteRolloutUpdateGroupAsync({
            graphqlClient,
            rolloutUpdateGroup,
        });
        const platforms = rolloutUpdateGroup.map(update => update.platform);
        const runtimeVersion = rolloutUpdateGroup[0].runtimeVersion;
        const targetBranch = {
            name: rolloutUpdateGroup[0].branchName,
            id: rolloutUpdateGroup[0].branchId,
        };
        await (0, roll_back_to_embedded_1.publishRollBackToEmbeddedUpdateAsync)({
            graphqlClient,
            projectId,
            exp,
            updateMessage,
            branch: targetBranch,
            codeSigningInfo,
            platforms,
            runtimeVersion,
            json: flags.json,
        });
    }
    async deleteRolloutUpdateGroupAsync({ graphqlClient, rolloutUpdateGroup, }) {
        const rolloutUpdateGroupId = rolloutUpdateGroup[0].groupId;
        const updateGroupDeletionReceipt = await (0, delete_1.scheduleUpdateGroupDeletionAsync)(graphqlClient, {
            group: rolloutUpdateGroupId,
        });
        const successfulReceipt = await (0, pollForBackgroundJobReceiptAsync_1.pollForBackgroundJobReceiptAsync)(graphqlClient, updateGroupDeletionReceipt);
        log_1.default.debug('Rollout update group deletion result', { successfulReceipt });
    }
    sanitizeFlags(rawFlags) {
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(rawFlags);
        const branchName = rawFlags.branch;
        const channelName = rawFlags.channel;
        const groupId = rawFlags.group;
        const privateKeyPath = rawFlags['private-key-path'];
        if (nonInteractive && !groupId) {
            throw new Error('Only --group can be used in non-interactive mode');
        }
        return {
            branchName,
            channelName,
            groupId,
            updateMessage: rawFlags.message,
            privateKeyPath,
            json,
            nonInteractive,
        };
    }
}
exports.default = UpdateRevertUpdateRollout;
function getUniqueUpdateGroups(updateGroups) {
    const uniqueUpdateGroups = new Map();
    for (const updateGroup of updateGroups) {
        const groupId = updateGroup[0].groupId;
        if (!uniqueUpdateGroups.has(groupId)) {
            uniqueUpdateGroups.set(groupId, updateGroup);
        }
    }
    return Array.from(uniqueUpdateGroups.values());
}
function updateGroupIsRolloutUpdateGroup(updateGroup) {
    return updateGroup.every(updateIsRolloutUpdate);
}
function updateIsRolloutUpdate(updateGroup) {
    return updateGroup.rolloutPercentage !== undefined && updateGroup.rolloutPercentage !== null;
}
function updateGroupIsUpdateGroupWithControlUpdate(updateGroup) {
    return updateGroup.every(updateIsRolloutWithControlUpdate);
}
function updateIsRolloutWithControlUpdate(updateGroup) {
    return !!updateGroup.rolloutControlUpdate;
}
