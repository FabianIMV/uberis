"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContextAsync = createContextAsync;
async function createContextAsync({ appStore, user, graphqlClient, projectId, }) {
    return {
        appStore,
        user,
        graphqlClient,
        projectId: projectId ?? null,
    };
}
