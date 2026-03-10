"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleChannelDeletionAsync = scheduleChannelDeletionAsync;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../graphql/client");
const BackgroundJobReceipt_1 = require("../graphql/types/BackgroundJobReceipt");
async function scheduleChannelDeletionAsync(graphqlClient, { channelId, }) {
    const result = await (0, client_1.withErrorHandlingAsync)(graphqlClient
        .mutation((0, graphql_tag_1.default) `
          mutation ScheduleChannelDeletion($channelId: ID!) {
            updateChannel {
              scheduleUpdateChannelDeletion(channelId: $channelId) {
                id
                ...BackgroundJobReceiptData
              }
            }
          }
          ${BackgroundJobReceipt_1.BackgroundJobReceiptNode}
        `, { channelId })
        .toPromise());
    return result.updateChannel.scheduleUpdateChannelDeletion;
}
