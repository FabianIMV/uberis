"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const BranchQuery_1 = require("../../graphql/queries/BranchQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const getBranchFromChannelNameAndCreateAndLinkIfNotExistsAsync_1 = require("../../update/getBranchFromChannelNameAndCreateAndLinkIfNotExistsAsync");
const republish_1 = require("../../update/republish");
const code_signing_1 = require("../../utils/code-signing");
const json_1 = require("../../utils/json");
const defaultRepublishPlatforms = ['android', 'ios'];
class UpdateRepublish extends EasCommand_1.default {
    static description = 'roll back to an existing update';
    static flags = {
        channel: core_1.Flags.string({
            description: 'Channel name to select an update group to republish from',
            exclusive: ['branch', 'group'],
        }),
        branch: core_1.Flags.string({
            description: 'Branch name to select an update group to republish from',
            exclusive: ['channel', 'group'],
        }),
        group: core_1.Flags.string({
            description: 'Update group ID to republish',
            exclusive: ['branch', 'channel'],
        }),
        'destination-channel': core_1.Flags.string({
            description: 'Channel name to select a branch to republish to if republishing to a different branch',
            exclusive: ['destination-branch'],
        }),
        'destination-branch': core_1.Flags.string({
            description: 'Branch name to republish to if republishing to a different branch',
            exclusive: ['destination-channel'],
        }),
        message: core_1.Flags.string({
            char: 'm',
            description: 'Short message describing the republished update group',
            required: false,
        }),
        platform: core_1.Flags.option({
            char: 'p',
            options: [...defaultRepublishPlatforms, 'all'],
            default: 'all',
            required: false,
        })(),
        'private-key-path': core_1.Flags.string({
            description: `File containing the PEM-encoded private key corresponding to the certificate in expo-updates' configuration. Defaults to a file named "private-key.pem" in the certificate's directory. Only relevant if you are using code signing: https://docs.expo.dev/eas-update/code-signing/`,
            required: false,
        }),
        'rollout-percentage': core_1.Flags.integer({
            description: `Percentage of users this update should be immediately available to. Users not in the rollout will be served the previous latest update on the branch, even if that update is itself being rolled out. The specified number must be an integer between 1 and 100. When not specified, this defaults to 100.`,
            required: false,
            min: 0,
            max: 100,
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectConfig,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags: rawFlags } = await this.parse(UpdateRepublish);
        const flags = this.sanitizeFlags(rawFlags);
        const { privateProjectConfig: { exp, projectId }, loggedIn: { graphqlClient }, } = await this.getContextAsync(UpdateRepublish, {
            nonInteractive: flags.nonInteractive,
            withServerSideEnvironment: null,
        });
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const codeSigningInfo = await (0, code_signing_1.getCodeSigningInfoAsync)(exp, flags.privateKeyPath);
        const existingUpdates = await (0, republish_1.getUpdateGroupOrAskForUpdateGroupAsync)(graphqlClient, projectId, flags);
        const updatesToPublish = existingUpdates.filter(update => flags.platform.includes(update.platform));
        if (existingUpdates.length === 0) {
            throw new Error(`There are no published updates found`);
        }
        if (updatesToPublish.length === 0) {
            throw new Error(`There are no updates on branch "${existingUpdates[0].branchName}" published for the platform(s) "${rawFlags.platform}" with group ID "${flags.groupId ? flags.groupId : updatesToPublish[0].groupId}". Did you mean to publish a new update instead?`);
        }
        if (rawFlags.platform !== 'all') {
            log_1.default.withTick(`The republished update group will appear only on: ${rawFlags.platform}`);
        }
        else {
            const platformsFromUpdates = updatesToPublish.map(update => update.platform);
            if (platformsFromUpdates.length < defaultRepublishPlatforms.length) {
                log_1.default.warn(`You are republishing an update group that wasn't published for all platforms.`);
            }
            log_1.default.withTick(`The republished update group will appear on the same platforms it was originally published on: ${platformsFromUpdates.join(', ')}`);
        }
        const arbitraryUpdate = updatesToPublish[0];
        const targetBranch = await getOrAskTargetBranchAsync(graphqlClient, projectId, flags, arbitraryUpdate);
        const updateMessage = await (0, republish_1.getOrAskUpdateMessageAsync)(updatesToPublish, flags);
        await (0, republish_1.republishAsync)({
            graphqlClient,
            app: { exp, projectId },
            updatesToPublish,
            targetBranch,
            updateMessage,
            codeSigningInfo,
            json: flags.json,
            rolloutPercentage: flags.rolloutPercentage,
        });
    }
    sanitizeFlags(rawFlags) {
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(rawFlags);
        const branchName = rawFlags.branch;
        const channelName = rawFlags.channel;
        const groupId = rawFlags.group;
        const destinationChannelName = rawFlags['destination-channel'];
        const destinationBranchName = rawFlags['destination-branch'];
        const privateKeyPath = rawFlags['private-key-path'];
        if (nonInteractive && !groupId) {
            throw new Error('Only --group can be used in non-interactive mode');
        }
        const platform = rawFlags.platform === 'all' ? defaultRepublishPlatforms : [rawFlags.platform];
        return {
            branchName,
            channelName,
            destinationChannelName,
            destinationBranchName,
            groupId,
            platform,
            updateMessage: rawFlags.message,
            privateKeyPath,
            rolloutPercentage: rawFlags['rollout-percentage'],
            json,
            nonInteractive,
        };
    }
}
exports.default = UpdateRepublish;
async function getOrAskTargetBranchAsync(graphqlClient, projectId, flags, arbitraryUpdate) {
    // if branch name supplied, use that
    if (flags.destinationBranchName) {
        const branch = await BranchQuery_1.BranchQuery.getBranchByNameAsync(graphqlClient, {
            appId: projectId,
            name: flags.destinationBranchName,
        });
        return { branchId: branch.id, branchName: branch.name };
    }
    // if provided channel name but was non-interactive
    if (flags.destinationChannelName) {
        return await (0, getBranchFromChannelNameAndCreateAndLinkIfNotExistsAsync_1.getBranchFromChannelNameAndCreateAndLinkIfNotExistsAsync)(graphqlClient, projectId, flags.destinationChannelName);
    }
    // if neither provided, assume republish on same branch
    return { branchId: arbitraryUpdate.branchId, branchName: arbitraryUpdate.branchName };
}
