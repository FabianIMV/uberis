"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pauseUpdateChannelAsync = pauseUpdateChannelAsync;
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const queries_1 = require("../../channel/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const client_1 = require("../../graphql/client");
const ChannelQuery_1 = require("../../graphql/queries/ChannelQuery");
const UpdateChannelBasicInfo_1 = require("../../graphql/types/UpdateChannelBasicInfo");
const log_1 = tslib_1.__importDefault(require("../../log"));
const json_1 = require("../../utils/json");
async function pauseUpdateChannelAsync(graphqlClient, { channelId }) {
    const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
        .mutation((0, graphql_tag_1.default) `
          mutation PauseUpdateChannel($channelId: ID!) {
            updateChannel {
              pauseUpdateChannel(channelId: $channelId) {
                id
                ...UpdateChannelBasicInfoFragment
              }
            }
          }
          ${(0, graphql_1.print)(UpdateChannelBasicInfo_1.UpdateChannelBasicInfoFragmentNode)}
        `, { channelId })
        .toPromise());
    const channel = data.updateChannel.pauseUpdateChannel;
    if (!channel) {
        throw new Error(`Could not find a channel with id: ${channelId}`);
    }
    return channel;
}
class ChannelPause extends EasCommand_1.default {
    static description = 'pause a channel to stop it from sending updates';
    static args = {
        name: core_1.Args.string({
            required: false,
            description: 'Name of the channel to edit',
        }),
    };
    static flags = {
        branch: core_1.Flags.string({
            description: 'Name of the branch to point to',
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args, flags } = await this.parse(ChannelPause);
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(ChannelPause, {
            nonInteractive,
        });
        if (json) {
            (0, json_1.enableJsonOutput)();
        }
        const existingChannel = args.name
            ? await ChannelQuery_1.ChannelQuery.viewUpdateChannelBasicInfoAsync(graphqlClient, {
                appId: projectId,
                channelName: args.name,
            })
            : await (0, queries_1.selectChannelOnAppAsync)(graphqlClient, {
                projectId,
                selectionPromptTitle: 'Select a channel to edit',
                paginatedQueryOptions: { json, nonInteractive, offset: 0 },
            });
        const channel = await pauseUpdateChannelAsync(graphqlClient, {
            channelId: existingChannel.id,
        });
        if (json) {
            (0, json_1.printJsonOnlyOutput)(channel);
        }
        else {
            log_1.default.withTick((0, chalk_1.default) `Channel {bold ${channel.name}} is now paused.\n`);
            log_1.default.addNewLineIfNone();
            log_1.default.log((0, chalk_1.default) `Users with builds on channel {bold ${channel.name}} will no longer receive updates.`);
        }
    }
}
exports.default = ChannelPause;
