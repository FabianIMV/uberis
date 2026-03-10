"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRunFragmentNode = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
exports.WorkflowRunFragmentNode = (0, graphql_tag_1.default) `
  fragment WorkflowRunFragment on WorkflowRun {
    id
    status
    gitCommitMessage
    gitCommitHash
    requestedGitRef
    actor {
      id
      __typename
      ... on UserActor {
        username
      }
      ... on Robot {
        firstName
      }
    }
    triggeringLabelName
    triggerEventType
    triggeringSchedule
    createdAt
    updatedAt
    errors {
      title
      message
    }
    workflow {
      id
      name
      fileName
    }
  }
`;
