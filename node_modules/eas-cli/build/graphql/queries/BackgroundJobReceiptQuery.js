"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundJobReceiptQuery = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const BackgroundJobReceipt_1 = require("../types/BackgroundJobReceipt");
exports.BackgroundJobReceiptQuery = {
    async byIdAsync(graphqlClient, backgroundJobReceiptId) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query BackgroundJobReceiptById($id: ID!) {
              backgroundJobReceipt {
                byId(id: $id) {
                  id
                  ...BackgroundJobReceiptData
                }
              }
            }
            ${BackgroundJobReceipt_1.BackgroundJobReceiptNode}
          `, { id: backgroundJobReceiptId }, {
            additionalTypenames: ['BackgroundJobReceipt'],
            requestPolicy: 'network-only',
        })
            .toPromise());
        return data.backgroundJobReceipt.byId ?? null;
    },
};
