"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const queries_1 = require("../../channel/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const pagination_1 = require("../../commandUtils/pagination");
const json_1 = require("../../utils/json");
class ChannelList extends EasCommand_1.default {
    static description = 'list all channels';
    static flags = {
        ...pagination_1.EasPaginatedQueryFlags,
        limit: (0, pagination_1.getLimitFlagWithCustomValues)({ defaultTo: 10, limit: queries_1.CHANNELS_LIMIT }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags } = await this.parse(ChannelList);
        const paginatedQueryOptions = (0, pagination_1.getPaginatedQueryOptions)(flags);
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(ChannelList, {
            nonInteractive,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        await (0, queries_1.listAndRenderChannelsOnAppAsync)(graphqlClient, {
            projectId,
            paginatedQueryOptions,
        });
    }
}
exports.default = ChannelList;
