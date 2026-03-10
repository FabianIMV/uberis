"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAscApiKeyValidAndTrackedAsync = isAscApiKeyValidAndTrackedAsync;
exports.getValidAndTrackedAscApiKeysAsync = getValidAndTrackedAscApiKeysAsync;
async function isAscApiKeyValidAndTrackedAsync(ctx, ascApiKey) {
    const ascApiKeyInfo = await ctx.appStore.getAscApiKeyAsync(ascApiKey.keyId);
    return isKeyValid(ascApiKeyInfo);
}
async function getValidAndTrackedAscApiKeysAsync(ctx, ascApiKeys) {
    const ascApiKeysInfo = await ctx.appStore.listAscApiKeysAsync();
    const validAscApiKeysInfo = ascApiKeysInfo.filter(keyInfo => isKeyValid(keyInfo));
    const validKeyIdentifiers = new Set(validAscApiKeysInfo.map(keyInfo => keyInfo.keyId));
    return ascApiKeys.filter(key => validKeyIdentifiers.has(key.keyIdentifier));
}
function isKeyValid(ascApiKeyInfo) {
    if (!ascApiKeyInfo) {
        return false;
    }
    return !ascApiKeyInfo.isRevoked;
}
