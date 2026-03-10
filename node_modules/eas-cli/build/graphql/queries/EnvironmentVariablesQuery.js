"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentVariablesQuery = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const EnvironmentVariable_1 = require("../types/EnvironmentVariable");
const EnvironmentVariableWithSecret_1 = require("../types/EnvironmentVariableWithSecret");
exports.EnvironmentVariablesQuery = {
    async environmentVariableEnvironmentsAsync(graphqlClient, appId) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AppEnvironmentVariableEnvironments($appId: String!) {
              app {
                byId(appId: $appId) {
                  id
                  environmentVariableEnvironments
                }
              }
            }
          `, { appId }, { additionalTypenames: ['App'] })
            .toPromise());
        return data.app?.byId.environmentVariableEnvironments ?? [];
    },
    async byAppIdWithSensitiveAsync(graphqlClient, { appId, environment, filterNames, includeFileContent = false, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query EnvironmentVariablesIncludingSensitiveByAppId(
              $appId: String!
              $filterNames: [String!]
              $environment: EnvironmentVariableEnvironment
              $includeFileContent: Boolean!
            ) {
              app {
                byId(appId: $appId) {
                  id
                  environmentVariablesIncludingSensitive(
                    filterNames: $filterNames
                    environment: $environment
                  ) {
                    id
                    ...EnvironmentVariableWithSecretFragment
                    valueWithFileContent: value(includeFileContent: $includeFileContent)
                      @include(if: $includeFileContent)
                  }
                }
              }
            }
            ${(0, graphql_1.print)(EnvironmentVariableWithSecret_1.EnvironmentVariableWithSecretFragmentNode)}
          `, { appId, filterNames, environment, includeFileContent }, { additionalTypenames: ['EnvironmentVariableWithSecret'] })
            .toPromise());
        return data.app?.byId.environmentVariablesIncludingSensitive ?? [];
    },
    async byAppIdAsync(graphqlClient, { appId, environment, filterNames, includeFileContent = false, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query EnvironmentVariablesByAppId(
              $appId: String!
              $filterNames: [String!]
              $environment: EnvironmentVariableEnvironment
              $includeFileContent: Boolean!
            ) {
              app {
                byId(appId: $appId) {
                  id
                  environmentVariables(filterNames: $filterNames, environment: $environment) {
                    id
                    linkedEnvironments(appId: $appId)
                    ...EnvironmentVariableFragment
                    valueWithFileContent: value(includeFileContent: $includeFileContent)
                      @include(if: $includeFileContent)
                  }
                }
              }
            }
            ${(0, graphql_1.print)(EnvironmentVariable_1.EnvironmentVariableFragmentNode)}
          `, { appId, filterNames, environment, includeFileContent }, { additionalTypenames: ['EnvironmentVariable'] })
            .toPromise());
        return data.app?.byId.environmentVariables ?? [];
    },
    async sharedAsync(graphqlClient, { appId, filterNames, environment, includeFileContent = false, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query EnvironmentVariablesShared(
              $appId: String!
              $filterNames: [String!]
              $environment: EnvironmentVariableEnvironment
              $includeFileContent: Boolean!
            ) {
              app {
                byId(appId: $appId) {
                  id
                  ownerAccount {
                    id
                    environmentVariables(filterNames: $filterNames, environment: $environment) {
                      id
                      linkedEnvironments(appId: $appId)
                      ...EnvironmentVariableFragment
                      valueWithFileContent: value(includeFileContent: $includeFileContent)
                        @include(if: $includeFileContent)
                    }
                  }
                }
              }
            }
            ${(0, graphql_1.print)(EnvironmentVariable_1.EnvironmentVariableFragmentNode)}
          `, { appId, filterNames, environment, includeFileContent }, { additionalTypenames: ['EnvironmentVariable'] })
            .toPromise());
        return data.app?.byId.ownerAccount.environmentVariables ?? [];
    },
    async sharedWithSensitiveAsync(graphqlClient, { appId, filterNames, environment, includeFileContent = false, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query EnvironmentVariablesSharedWithSensitive(
              $appId: String!
              $filterNames: [String!]
              $environment: EnvironmentVariableEnvironment
              $includeFileContent: Boolean!
            ) {
              app {
                byId(appId: $appId) {
                  id
                  ownerAccount {
                    id
                    environmentVariablesIncludingSensitive(
                      filterNames: $filterNames
                      environment: $environment
                    ) {
                      id
                      ...EnvironmentVariableWithSecretFragment
                      valueWithFileContent: value(includeFileContent: $includeFileContent)
                        @include(if: $includeFileContent)
                    }
                  }
                }
              }
            }
            ${(0, graphql_1.print)(EnvironmentVariableWithSecret_1.EnvironmentVariableWithSecretFragmentNode)}
          `, { appId, filterNames, environment, includeFileContent }, { additionalTypenames: ['EnvironmentVariableWithSecret'] })
            .toPromise());
        return data.app?.byId.ownerAccount.environmentVariablesIncludingSensitive ?? [];
    },
};
