"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRunMutation = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
var WorkflowRunMutation;
(function (WorkflowRunMutation) {
    async function createWorkflowRunAsync(graphqlClient, { appId, workflowRevisionInput, workflowRunInput, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateWorkflowRun(
              $appId: ID!
              $workflowRevisionInput: WorkflowRevisionInput!
              $workflowRunInput: WorkflowRunInput!
            ) {
              workflowRun {
                createWorkflowRun(
                  appId: $appId
                  workflowRevisionInput: $workflowRevisionInput
                  workflowRunInput: $workflowRunInput
                ) {
                  id
                }
              }
            }
          `, {
            appId,
            workflowRevisionInput,
            workflowRunInput,
        })
            .toPromise());
        return { id: data.workflowRun.createWorkflowRun.id };
    }
    WorkflowRunMutation.createWorkflowRunAsync = createWorkflowRunAsync;
    async function createWorkflowRunFromGitRefAsync(graphqlClient, { workflowRevisionId, gitRef, inputs, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateWorkflowRunFromGitRef(
              $workflowRevisionId: ID!
              $gitRef: String!
              $inputs: JSONObject
            ) {
              workflowRun {
                createWorkflowRunFromGitRef(
                  workflowRevisionId: $workflowRevisionId
                  gitRef: $gitRef
                  inputs: $inputs
                ) {
                  id
                }
              }
            }
          `, {
            workflowRevisionId,
            gitRef,
            inputs,
        })
            .toPromise());
        return { id: data.workflowRun.createWorkflowRunFromGitRef.id };
    }
    WorkflowRunMutation.createWorkflowRunFromGitRefAsync = createWorkflowRunFromGitRefAsync;
    async function createExpoGoRepackWorkflowRunAsync(graphqlClient, { appId, projectSource, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation(
        /* eslint-disable graphql/template-strings */
        (0, graphql_tag_1.default) `
            mutation CreateExpoGoRepackWorkflowRun($appId: ID!, $projectSource: WorkflowProjectSourceInput!) {
              workflowRun {
                createExpoGoRepackWorkflowRun(appId: $appId, projectSource: $projectSource) {
                  id
                }
              }
            }
          `, 
        /* eslint-enable graphql/template-strings */
        { appId, projectSource })
            .toPromise());
        return { id: data.workflowRun.createExpoGoRepackWorkflowRun.id };
    }
    WorkflowRunMutation.createExpoGoRepackWorkflowRunAsync = createExpoGoRepackWorkflowRunAsync;
    async function cancelWorkflowRunAsync(graphqlClient, { workflowRunId, }) {
        await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CancelWorkflowRun($workflowRunId: ID!) {
              workflowRun {
                cancelWorkflowRun(workflowRunId: $workflowRunId) {
                  id
                }
              }
            }
          `, {
            workflowRunId,
        })
            .toPromise());
    }
    WorkflowRunMutation.cancelWorkflowRunAsync = cancelWorkflowRunAsync;
})(WorkflowRunMutation || (exports.WorkflowRunMutation = WorkflowRunMutation = {}));
