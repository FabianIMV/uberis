"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetQuery = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
exports.AssetQuery = {
    async getSignedUrlsAsync(graphqlClient, updateId, storageKeys) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query GetAssetSignedUrls($updateId: ID!, $storageKeys: [String!]!) {
              asset {
                signedUrls(updateId: $updateId, storageKeys: $storageKeys) {
                  storageKey
                  url
                  headers
                }
              }
            }
          `, {
            updateId,
            storageKeys,
        }, { additionalTypenames: [] })
            .toPromise());
        return data.asset.signedUrls;
    },
};
