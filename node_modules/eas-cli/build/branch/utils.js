"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchNotFoundError = void 0;
exports.getDefaultBranchNameAsync = getDefaultBranchNameAsync;
async function getDefaultBranchNameAsync(vcsClient) {
    return await vcsClient.getBranchNameAsync();
}
class BranchNotFoundError extends Error {
    constructor(message) {
        super(message ?? 'Branch not found.');
    }
}
exports.BranchNotFoundError = BranchNotFoundError;
