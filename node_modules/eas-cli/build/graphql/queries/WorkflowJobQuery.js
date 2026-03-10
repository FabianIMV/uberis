"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowJobQuery = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const WorkflowJob_1 = require("../types/WorkflowJob");
exports.WorkflowJobQuery = {
    async byIdAsync(graphqlClient, workflowJobId, { useCache = true } = {}) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query WorkflowJobById($workflowJobId: ID!) {
              workflowJobs {
                byId(workflowJobId: $workflowJobId) {
                  id
                  ...WorkflowJobFragment
                }
              }
            }
            ${(0, graphql_1.print)(WorkflowJob_1.WorkflowJobFragmentNode)}
          `, { workflowJobId }, {
            requestPolicy: useCache ? 'cache-first' : 'network-only',
            additionalTypenames: ['WorkflowJob'],
        })
            .toPromise());
        return data.workflowJobs.byId;
    },
};
