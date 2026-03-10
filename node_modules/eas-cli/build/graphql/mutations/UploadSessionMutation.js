"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadSessionMutation = void 0;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
exports.UploadSessionMutation = {
    async createUploadSessionAsync(graphqlClient, type, filename) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateUploadSessionMutation($type: UploadSessionType!, $filename: String) {
              uploadSession {
                createUploadSession(type: $type, filename: $filename)
              }
            }
          `, {
            type,
            filename,
        })
            .toPromise());
        return data.uploadSession.createUploadSession;
    },
    async createAccountScopedUploadSessionAsync(graphqlClient, { type, accountID, }) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .mutation((0, graphql_tag_1.default) `
            mutation CreateAccountScopedUploadSessionMutation(
              $accountID: ID!
              $type: AccountUploadSessionType!
            ) {
              uploadSession {
                createAccountScopedUploadSession(accountID: $accountID, type: $type)
              }
            }
          `, {
            type,
            accountID,
        })
            .toPromise());
        return data.uploadSession.createAccountScopedUploadSession;
    },
};
