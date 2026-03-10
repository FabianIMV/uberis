"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FingerprintMutation = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const Fingerprint_1 = require("../types/Fingerprint");
exports.FingerprintMutation = {
    async createFingerprintAsync(graphqlClient, appId, fingerprintData) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateFingeprintMutation(
              $fingerprintData: CreateFingerprintInput!
              $appId: ID!
            ) {
              fingerprint {
                createOrGetExistingFingerprint(fingerprintData: $fingerprintData, appId: $appId) {
                  id
                  ...FingerprintFragment
                }
              }
            }
            ${(0, graphql_1.print)(Fingerprint_1.FingerprintFragmentNode)}
          `, { appId, fingerprintData })
            .toPromise());
        return data.fingerprint.createOrGetExistingFingerprint;
    },
};
