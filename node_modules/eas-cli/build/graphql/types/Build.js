"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildFragmentWithFingerprintNode = exports.BuildFragmentWithSubmissionsNode = exports.BuildFragmentNode = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const Fingerprint_1 = require("./Fingerprint");
const Submission_1 = require("./Submission");
exports.BuildFragmentNode = (0, graphql_tag_1.default) `
  fragment BuildFragment on Build {
    id
    status
    platform
    error {
      errorCode
      message
      docsUrl
    }
    artifacts {
      buildUrl
      xcodeBuildLogsUrl
      applicationArchiveUrl
      buildArtifactsUrl
    }
    fingerprint {
      id
      hash
    }
    initiatingActor {
      __typename
      id
      displayName
    }
    logFiles
    project {
      __typename
      id
      name
      slug
      ... on App {
        ownerAccount {
          id
          name
        }
      }
    }
    channel
    distribution
    iosEnterpriseProvisioning
    buildProfile
    sdkVersion
    appVersion
    appBuildVersion
    runtimeVersion
    gitCommitHash
    gitCommitMessage
    initialQueuePosition
    queuePosition
    estimatedWaitTimeLeftSeconds
    priority
    createdAt
    updatedAt
    message
    completedAt
    expirationDate
    isForIosSimulator
    metrics {
      buildWaitTime
      buildQueueTime
      buildDuration
    }
  }
`;
exports.BuildFragmentWithSubmissionsNode = (0, graphql_tag_1.default) `
  ${(0, graphql_1.print)(Submission_1.SubmissionFragmentNode)}
  ${(0, graphql_1.print)(exports.BuildFragmentNode)}

  fragment BuildWithSubmissionsFragment on Build {
    id
    ...BuildFragment
    submissions {
      id
      ...SubmissionFragment
    }
  }
`;
exports.BuildFragmentWithFingerprintNode = (0, graphql_tag_1.default) `
  ${(0, graphql_1.print)(Fingerprint_1.FingerprintFragmentNode)}
  ${(0, graphql_1.print)(exports.BuildFragmentNode)}

  fragment BuildWithFingerprintFragment on Build {
    id
    ...BuildFragment
    fingerprint {
      id
      ...FingerprintFragment
    }
  }
`;
