"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FingerprintFragmentNode = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
exports.FingerprintFragmentNode = (0, graphql_tag_1.default) `
  fragment FingerprintFragment on Fingerprint {
    id
    hash
    debugInfoUrl
    builds(first: 1) {
      edges {
        node {
          id
          ... on Build {
            platform
          }
        }
      }
    }
    updates(first: 1) {
      edges {
        node {
          id
          platform
        }
      }
    }
  }
`;
