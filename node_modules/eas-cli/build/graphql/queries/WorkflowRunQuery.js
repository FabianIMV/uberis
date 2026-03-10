"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRunQuery = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const WorkflowJob_1 = require("../types/WorkflowJob");
const WorkflowRun_1 = require("../types/WorkflowRun");
exports.WorkflowRunQuery = {
    async byIdAsync(graphqlClient, workflowRunId, { useCache = true } = {}) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query WorkflowRunById($workflowRunId: ID!) {
              workflowRuns {
                byId(workflowRunId: $workflowRunId) {
                  id
                  status
                }
              }
            }
          `, { workflowRunId }, {
            requestPolicy: useCache ? 'cache-first' : 'network-only',
            additionalTypenames: ['WorkflowRun'],
        })
            .toPromise());
        return data.workflowRuns.byId;
    },
    async withJobsByIdAsync(graphqlClient, workflowRunId, { useCache = true } = {}) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query WorkflowRunByIdWithJobs($workflowRunId: ID!) {
              workflowRuns {
                byId(workflowRunId: $workflowRunId) {
                  id
                  workflow {
                    id
                    app {
                      id
                      name
                      ownerAccount {
                        id
                        name
                      }
                    }
                  }
                  jobs {
                    id
                    ...WorkflowJobFragment
                  }
                  ...WorkflowRunFragment
                }
              }
            }
            ${(0, graphql_1.print)(WorkflowRun_1.WorkflowRunFragmentNode)}
            ${(0, graphql_1.print)(WorkflowJob_1.WorkflowJobFragmentNode)}
          `, { workflowRunId }, {
            requestPolicy: useCache ? 'cache-first' : 'network-only',
            additionalTypenames: ['WorkflowRun'],
        })
            .toPromise());
        return data.workflowRuns.byId;
    },
    async byAppIdFileNameAndStatusAsync(graphqlClient, appId, fileName, status, limit) {
        validateLimit(limit);
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query WorkflowRunsForAppIdFileNameAndStatusQuery(
              $appId: ID!
              $fileName: String!
              $status: WorkflowRunStatus
              $limit: Int!
            ) {
              workflows {
                byAppIdAndFileName(appId: $appId, fileName: $fileName) {
                  id
                  runs: runsPaginated(first: $limit, filter: { status: $status }) {
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
          `, { appId, fileName, status, limit }, { additionalTypenames: ['Workflow'] })
            .toPromise());
        (0, assert_1.default)(data.workflows, 'GraphQL: `workflows` not defined in server response');
        return data.workflows.byAppIdAndFileName.runs.edges.map(edge => edge.node);
    },
};
function validateLimit(limit) {
    (0, assert_1.default)(limit, 'limit is required');
    (0, assert_1.default)(limit > 0, 'limit must be greater than 0');
    (0, assert_1.default)(limit <= 100, 'limit must be less than or equal to 100');
}
