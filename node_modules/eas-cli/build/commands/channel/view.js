"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const assert_1 = tslib_1.__importDefault(require("assert"));
const queries_1 = require("../../channel/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const pagination_1 = require("../../commandUtils/pagination");
const json_1 = require("../../utils/json");
class ChannelView extends EasCommand_1.default {
    static description = 'view a channel';
    static args = {
        name: core_1.Args.string({
            required: false,
            description: 'Name of the channel to view',
        }),
    };
    static flags = {
        ...flags_1.EasNonInteractiveAndJsonFlags,
        ...pagination_1.EasPaginatedQueryFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        let { args: { name: channelName }, flags, } = await this.parse(ChannelView);
        const paginatedQueryOptions = (0, pagination_1.getPaginatedQueryOptions)(flags);
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(ChannelView, {
            nonInteractive,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        if (!channelName) {
            const validationMessage = 'A channel name is required to view a specific channel.';
            if (nonInteractive) {
                throw new Error(validationMessage);
            }
            const selectedUpdateChannel = await (0, queries_1.selectChannelOnAppAsync)(graphqlClient, {
                projectId,
                selectionPromptTitle: 'Select a channel to view',
                paginatedQueryOptions: {
                    json: jsonFlag,
                    nonInteractive,
                    offset: 0,
                },
            });
            channelName = selectedUpdateChannel.name;
            (0, assert_1.default)(channelName, `A channel must be selected.`);
        }
        await (0, queries_1.listAndRenderBranchesAndUpdatesOnChannelAsync)(graphqlClient, {
            projectId,
            channelName,
            paginatedQueryOptions,
        });
    }
}
exports.default = ChannelView;
