"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FingerprintQuery = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const Fingerprint_1 = require("../types/Fingerprint");
exports.FingerprintQuery = {
    async byHashAsync(graphqlClient, { appId, hash, }) {
        const fingerprintConnection = await exports.FingerprintQuery.getFingerprintsAsync(graphqlClient, {
            appId,
            fingerprintFilter: { hashes: [hash] },
            first: 1,
        });
        const fingerprints = fingerprintConnection.edges.map(edge => edge.node);
        return fingerprints[0] ?? null;
    },
    async getFingerprintsAsync(graphqlClient, { appId, first, after, last, before, fingerprintFilter, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query FingerprintsByAppId(
              $appId: String!
              $after: String
              $first: Int
              $before: String
              $last: Int
              $fingerprintFilter: FingerprintFilterInput
            ) {
              app {
                byId(appId: $appId) {
                  id
                  fingerprintsPaginated(
                    after: $after
                    first: $first
                    before: $before
                    last: $last
                    filter: $fingerprintFilter
                  ) {
                    edges {
                      node {
                        id
                        ...FingerprintFragment
                      }
                    }
                    pageInfo {
                      hasNextPage
                      hasPreviousPage
                      startCursor
                      endCursor
                    }
                  }
                }
              }
            }
            ${(0, graphql_1.print)(Fingerprint_1.FingerprintFragmentNode)}
          `, { appId, after, first, before, last, fingerprintFilter }, { additionalTypenames: ['Fingerprint'] })
            .toPromise());
        return data.app?.byId.fingerprintsPaginated;
    },
};
