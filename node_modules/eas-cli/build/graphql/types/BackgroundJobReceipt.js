"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundJobReceiptNode = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
exports.BackgroundJobReceiptNode = (0, graphql_tag_1.default) `
  fragment BackgroundJobReceiptData on BackgroundJobReceipt {
    id
    state
    tries
    willRetry
    resultId
    resultType
    resultData
    errorCode
    errorMessage
    createdAt
    updatedAt
  }
`;
