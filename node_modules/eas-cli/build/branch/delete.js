"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleBranchDeletionAsync = scheduleBranchDeletionAsync;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../graphql/client");
const BackgroundJobReceipt_1 = require("../graphql/types/BackgroundJobReceipt");
async function scheduleBranchDeletionAsync(graphqlClient, { branchId, }) {
    const result = await (0, client_1.withErrorHandlingAsync)(graphqlClient
        .mutation((0, graphql_tag_1.default) `
          mutation ScheduleBranchDeletion($branchId: ID!) {
            updateBranch {
              scheduleUpdateBranchDeletion(branchId: $branchId) {
                id
                ...BackgroundJobReceiptData
              }
            }
          }
          ${BackgroundJobReceipt_1.BackgroundJobReceiptNode}
        `, { branchId })
        .toPromise());
    return result.updateBranch.scheduleUpdateBranchDeletion;
}
