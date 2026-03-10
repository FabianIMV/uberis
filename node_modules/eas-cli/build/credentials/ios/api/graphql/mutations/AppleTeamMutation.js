"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppleTeamMutation = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../../../../../graphql/client");
const AppleTeam_1 = require("../../../../../graphql/types/credentials/AppleTeam");
exports.AppleTeamMutation = {
    async createAppleTeamAsync(graphqlClient, appleTeamInput, accountId) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateAppleTeamMutation($appleTeamInput: AppleTeamInput!, $accountId: ID!) {
              appleTeam {
                createAppleTeam(appleTeamInput: $appleTeamInput, accountId: $accountId) {
                  id
                  ...AppleTeamFragment
                }
              }
            }
            ${(0, graphql_1.print)(AppleTeam_1.AppleTeamFragmentNode)}
          `, {
            appleTeamInput,
            accountId,
        })
            .toPromise());
        return data.appleTeam.createAppleTeam;
    },
    async updateAppleTeamAsync(graphqlClient, appleTeamInput, appleTeamEntityId) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation UpdateAppleTeamMutation(
              $appleTeamInput: AppleTeamUpdateInput!
              $appleTeamEntityId: ID!
            ) {
              appleTeam {
                updateAppleTeam(appleTeamUpdateInput: $appleTeamInput, id: $appleTeamEntityId) {
                  id
                  ...AppleTeamFragment
                }
              }
            }
            ${(0, graphql_1.print)(AppleTeam_1.AppleTeamFragmentNode)}
          `, {
            appleTeamInput,
            appleTeamEntityId,
        })
            .toPromise());
        return data.appleTeam.updateAppleTeam;
    },
};
