"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAppleTeamIfAuthenticatedAsync = resolveAppleTeamIfAuthenticatedAsync;
async function resolveAppleTeamIfAuthenticatedAsync(ctx, app) {
    if (!ctx.appStore.authCtx) {
        return null;
    }
    return await ctx.ios.createOrGetExistingAppleTeamAndUpdateNameIfChangedAsync(ctx.graphqlClient, app.account.id, {
        appleTeamIdentifier: ctx.appStore.authCtx.team.id,
        appleTeamName: ctx.appStore.authCtx.team.name,
    });
}
