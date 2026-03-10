"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppQuery = void 0;
const tslib_1 = require("tslib");
/* eslint-disable graphql/template-strings */
const assert_1 = tslib_1.__importDefault(require("assert"));
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const App_1 = require("../types/App");
const Workflow_1 = require("../types/Workflow");
const WorkflowRun_1 = require("../types/WorkflowRun");
exports.AppQuery = {
    async byIdAsync(graphqlClient, projectId) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AppByIdQuery($appId: String!) {
              app {
                byId(appId: $appId) {
                  id
                  ...AppFragment
                }
              }
            }
            ${(0, graphql_1.print)(App_1.AppFragmentNode)}
          `, { appId: projectId }, {
            additionalTypenames: ['App'],
        })
            .toPromise());
        (0, assert_1.default)(data.app, 'GraphQL: `app` not defined in server response');
        return data.app.byId;
    },
    async byFullNameAsync(graphqlClient, fullName) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AppByFullNameQuery($fullName: String!) {
              app {
                byFullName(fullName: $fullName) {
                  id
                  ...AppFragment
                }
              }
            }
            ${(0, graphql_1.print)(App_1.AppFragmentNode)}
          `, { fullName }, {
            additionalTypenames: ['App'],
        })
            .toPromise());
        (0, assert_1.default)(data.app, 'GraphQL: `app` not defined in server response');
        return data.app.byFullName;
    },
    async byIdWorkflowsAsync(graphqlClient, appId) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AppByIdWorkflowsQuery($appId: String!) {
              app {
                byId(appId: $appId) {
                  id
                  workflows {
                    id
                    ...WorkflowFragment
                  }
                }
              }
            }
            ${(0, graphql_1.print)(Workflow_1.WorkflowFragmentNode)}
          `, { appId }, { additionalTypenames: ['App'] })
            .toPromise());
        (0, assert_1.default)(data.app, 'GraphQL: `app` not defined in server response');
        return data.app.byId.workflows;
    },
    async byIdWorkflowRunsFilteredByStatusAsync(graphqlClient, appId, status, limit) {
        validateLimit(limit);
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AppByIdWorkflowRunsFilteredByStatusQuery(
              $appId: String!
              $status: WorkflowRunStatus
              $limit: Int!
            ) {
              app {
                byId(appId: $appId) {
                  id
                  runs: workflowRunsPaginated(first: $limit, filter: { status: $status }) {
                    edges {
                      node {
                        id
                        ...WorkflowRunFragment
                      }
                    }
                  }
                }
              }
            }
            ${(0, graphql_1.print)(WorkflowRun_1.WorkflowRunFragmentNode)}
          `, { appId, status, limit }, { additionalTypenames: ['App'] })
            .toPromise());
        (0, assert_1.default)(data.app, 'GraphQL: `app` not defined in server response');
        return data.app.byId.runs.edges.map(edge => edge.node);
    },
};
function validateLimit(limit) {
    (0, assert_1.default)(limit, 'limit is required');
    (0, assert_1.default)(limit > 0, 'limit must be greater than 0');
    (0, assert_1.default)(limit <= 100, 'limit must be less than or equal to 100');
}
