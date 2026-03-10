"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRevisionMutation = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const zod_1 = require("zod");
const client_1 = require("../client");
var WorkflowRevisionMutation;
(function (WorkflowRevisionMutation) {
    WorkflowRevisionMutation.ValidationErrorExtensionZ = zod_1.z.object({
        errorCode: zod_1.z.literal('VALIDATION_ERROR'),
        metadata: zod_1.z.object({
            formErrors: zod_1.z.array(zod_1.z.string()),
            fieldErrors: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())),
        }),
    });
    async function getOrCreateWorkflowRevisionFromGitRefAsync(graphqlClient, { appId, fileName, gitRef, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation GetOrCreateWorkflowRevisionFromGitRef($appId: ID!, $fileName: String!, $gitRef: String!) {
              workflowRevision {
                getOrCreateWorkflowRevisionFromGitRef(appId: $appId, fileName: $fileName, gitRef: $gitRef) {
                  id
                  yamlConfig
                  blobSha
                  commitSha
                  createdAt
                  workflow {
                    id
                  }
                }
              }
            }
          `, {
            appId,
            fileName,
            gitRef,
        })
            .toPromise());
        return (data.workflowRevision?.getOrCreateWorkflowRevisionFromGitRef ??
            undefined);
    }
    WorkflowRevisionMutation.getOrCreateWorkflowRevisionFromGitRefAsync = getOrCreateWorkflowRevisionFromGitRefAsync;
    async function validateWorkflowYamlConfigAsync(graphqlClient, { appId, yamlConfig, }) {
        await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation ValidateWorkflowYamlConfig($appId: ID!, $yamlConfig: String!) {
              workflowRevision {
                validateWorkflowYamlConfig(appId: $appId, yamlConfig: $yamlConfig)
              }
            }
          `, {
            appId,
            yamlConfig,
        })
            .toPromise());
    }
    WorkflowRevisionMutation.validateWorkflowYamlConfigAsync = validateWorkflowYamlConfigAsync;
})(WorkflowRevisionMutation || (exports.WorkflowRevisionMutation = WorkflowRevisionMutation = {}));
