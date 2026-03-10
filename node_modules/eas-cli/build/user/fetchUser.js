"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUserAsync = fetchUserAsync;
const tslib_1 = require("tslib");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const createGraphqlClient_1 = require("../commandUtils/context/contextUtils/createGraphqlClient");
const client_1 = require("../graphql/client");
async function fetchUserAsync({ sessionSecret, }) {
    const graphqlClient = (0, createGraphqlClient_1.createGraphqlClient)({ accessToken: null, sessionSecret });
    const result = await (0, client_1.withErrorHandlingAsync)(graphqlClient
        .query((0, graphql_tag_1.default) `
          query MeUserActorQuery {
            meUserActor {
              id
              username
            }
          }
        `, {}, { additionalTypenames: ['UserActor'] })
        .toPromise());
    const meUserActor = result.meUserActor;
    if (!meUserActor) {
        throw new Error('Failed to fetch user data after login.');
    }
    return {
        id: meUserActor.id,
        username: meUserActor.username,
    };
}
