"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowJobFragmentNode = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const Build_1 = require("./Build");
exports.WorkflowJobFragmentNode = (0, graphql_tag_1.default) `
  fragment WorkflowJobFragment on WorkflowJob {
    id
    key
    name
    status
    workflowRun {
      id
    }
    type
    turtleJobRun {
      id
      logFileUrls
      artifacts {
        id
        name
        contentType
        fileSizeBytes
        filename
        downloadUrl
      }
      errors {
        errorCode
        message
      }
    }
    turtleBuild {
      id
      ...BuildFragment
    }
    outputs
    errors {
      title
      message
    }
    createdAt
    updatedAt
  }
  ${Build_1.BuildFragmentNode}
`;
