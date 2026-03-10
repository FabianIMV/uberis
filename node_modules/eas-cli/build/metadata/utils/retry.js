"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitAsync = waitAsync;
exports.retryIfNullAsync = retryIfNullAsync;
async function waitAsync(duration) {
    await new Promise(resolve => setTimeout(resolve, duration));
}
async function retryIfNullAsync(method, options = {}) {
    let { tries = 5, delay = 1000 } = options;
    while (tries > 0) {
        const value = await method();
        if (value !== null) {
            return value;
        }
        tries--;
        options.onRetry?.(tries);
        await waitAsync(delay);
    }
    return null;
}
