"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleUpdateGroupDeletionAsync = scheduleUpdateGroupDeletionAsync;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../graphql/client");
const BackgroundJobReceipt_1 = require("../graphql/types/BackgroundJobReceipt");
async function scheduleUpdateGroupDeletionAsync(graphqlClient, { group, }) {
    const result = await (0, client_1.withErrorHandlingAsync)(graphqlClient
        .mutation((0, graphql_tag_1.default) `
          mutation ScheduleUpdateGroupDeletion($group: ID!) {
            update {
              scheduleUpdateGroupDeletion(group: $group) {
                id
                ...BackgroundJobReceiptData
              }
            }
          }
          ${BackgroundJobReceipt_1.BackgroundJobReceiptNode}
        `, { group })
        .toPromise());
    return result.update.scheduleUpdateGroupDeletion;
}
