"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowFragmentNode = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
exports.WorkflowFragmentNode = (0, graphql_tag_1.default) `
  fragment WorkflowFragment on Workflow {
    id
    name
    fileName
    createdAt
    updatedAt
    revisionsPaginated(first: 1) {
      edges {
        node {
          id
          blobSha
          commitSha
          createdAt
          yamlConfig
        }
      }
    }
  }
`;
