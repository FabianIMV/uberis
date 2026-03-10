"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPushKeyValidAndTrackedAsync = isPushKeyValidAndTrackedAsync;
const CredentialsUtils_1 = require("../appstore/CredentialsUtils");
async function isPushKeyValidAndTrackedAsync(ctx, pushKey) {
    const pushInfoFromApple = await ctx.appStore.listPushKeysAsync();
    const validPushKeys = await (0, CredentialsUtils_1.filterRevokedAndUntrackedPushKeysAsync)([pushKey], pushInfoFromApple);
    return validPushKeys.length > 0;
}
