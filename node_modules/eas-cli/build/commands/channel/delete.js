"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const delete_1 = require("../../channel/delete");
const queries_1 = require("../../channel/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const ChannelQuery_1 = require("../../graphql/queries/ChannelQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const json_1 = require("../../utils/json");
const pollForBackgroundJobReceiptAsync_1 = require("../../utils/pollForBackgroundJobReceiptAsync");
class ChannelDelete extends EasCommand_1.default {
    static description = 'Delete a channel';
    static args = {
        name: core_1.Args.string({
            required: false,
            description: 'Name of the channel to delete',
        }),
    };
    static flags = {
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args: { name: nameArg }, flags, } = await this.parse(ChannelDelete);
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(ChannelDelete, {
            nonInteractive,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        let channelId, channelName;
        if (nameArg) {
            const { id, name } = await ChannelQuery_1.ChannelQuery.viewUpdateChannelBasicInfoAsync(graphqlClient, {
                appId: projectId,
                channelName: nameArg,
            });
            channelId = id;
            channelName = name;
        }
        else {
            if (nonInteractive) {
                throw new Error('Channel name must be set when running in non-interactive mode');
            }
            const { id, name } = await (0, queries_1.selectChannelOnAppAsync)(graphqlClient, {
                projectId,
                selectionPromptTitle: 'Select a channel to delete',
                paginatedQueryOptions: {
                    json: jsonFlag,
                    nonInteractive,
                    offset: 0,
                },
            });
            channelId = id;
            channelName = name;
        }
        if (!nonInteractive) {
            log_1.default.addNewLineIfNone();
            log_1.default.warn(`You are about to permanently delete channel: "${channelName}". Deleting this channel will also permanently remove all associated builds from your account. \nThis action is irreversible.`);
            log_1.default.newLine();
            const confirmed = await (0, prompts_1.toggleConfirmAsync)({ message: 'Are you sure you wish to proceed?' });
            if (!confirmed) {
                log_1.default.error(`Canceled deletion of channel: "${channelName}".`);
                process.exit(1);
            }
        }
        const receipt = await (0, delete_1.scheduleChannelDeletionAsync)(graphqlClient, { channelId });
        const successfulReceipt = await (0, pollForBackgroundJobReceiptAsync_1.pollForBackgroundJobReceiptAsync)(graphqlClient, receipt);
        log_1.default.debug('Deletion result', { successfulReceipt });
        if (jsonFlag) {
            (0, json_1.printJsonOnlyOutput)({ id: channelId });
        }
        else {
            log_1.default.withTick(`️Deleted channel "${channelName}".`);
        }
    }
}
exports.default = ChannelDelete;
