"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentVariableWithSecretFragmentNode = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
exports.EnvironmentVariableWithSecretFragmentNode = (0, graphql_tag_1.default) `
  fragment EnvironmentVariableWithSecretFragment on EnvironmentVariableWithSecret {
    id
    name
    value
    environments
    createdAt
    updatedAt
    scope
    visibility
    type
  }
`;
