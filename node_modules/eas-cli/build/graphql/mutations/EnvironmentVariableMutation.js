"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentVariableMutation = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const EnvironmentVariable_1 = require("../types/EnvironmentVariable");
exports.EnvironmentVariableMutation = {
    async createSharedVariableAsync(graphqlClient, input, accountId) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateEnvironmentVariableForAccount(
              $input: CreateSharedEnvironmentVariableInput!
              $accountId: ID!
            ) {
              environmentVariable {
                createEnvironmentVariableForAccount(
                  environmentVariableData: $input
                  accountId: $accountId
                ) {
                  id
                  ...EnvironmentVariableFragment
                }
              }
            }
            ${(0, graphql_1.print)(EnvironmentVariable_1.EnvironmentVariableFragmentNode)}
          `, { input, accountId })
            .toPromise());
        return data.environmentVariable.createEnvironmentVariableForAccount;
    },
    async createForAppAsync(graphqlClient, input, appId) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateEnvironmentVariableForApp(
              $input: CreateEnvironmentVariableInput!
              $appId: ID!
            ) {
              environmentVariable {
                createEnvironmentVariableForApp(environmentVariableData: $input, appId: $appId) {
                  id
                  ...EnvironmentVariableFragment
                }
              }
            }
            ${(0, graphql_1.print)(EnvironmentVariable_1.EnvironmentVariableFragmentNode)}
          `, { input, appId })
            .toPromise());
        return data.environmentVariable.createEnvironmentVariableForApp;
    },
    async updateAsync(graphqlClient, input) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation UpdateEnvironmentVariable($input: UpdateEnvironmentVariableInput!) {
              environmentVariable {
                updateEnvironmentVariable(environmentVariableData: $input) {
                  id
                  ...EnvironmentVariableFragment
                }
              }
            }
            ${(0, graphql_1.print)(EnvironmentVariable_1.EnvironmentVariableFragmentNode)}
          `, { input })
            .toPromise());
        return data.environmentVariable.updateEnvironmentVariable;
    },
    async deleteAsync(graphqlClient, id) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation DeleteEnvironmentVariable($id: ID!) {
              environmentVariable {
                deleteEnvironmentVariable(id: $id) {
                  id
                }
              }
            }
          `, { id })
            .toPromise());
        return data.environmentVariable.deleteEnvironmentVariable;
    },
    async createBulkEnvironmentVariablesForAppAsync(graphqlClient, input, appId) {
        await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateBulkEnvironmentVariablesForApp(
              $input: [CreateEnvironmentVariableInput!]!
              $appId: ID!
            ) {
              environmentVariable {
                createBulkEnvironmentVariablesForApp(environmentVariablesData: $input, appId: $appId) {
                  id
                }
              }
            }
          `, { input, appId })
            .toPromise());
        return true;
    },
};
