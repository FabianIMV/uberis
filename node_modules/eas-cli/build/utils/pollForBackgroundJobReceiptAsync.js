"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundJobReceiptPollError = exports.BackgroundJobReceiptPollErrorType = void 0;
exports.pollForBackgroundJobReceiptAsync = pollForBackgroundJobReceiptAsync;
const core_1 = require("@urql/core");
const set_interval_async_1 = require("set-interval-async");
const generated_1 = require("../graphql/generated");
const BackgroundJobReceiptQuery_1 = require("../graphql/queries/BackgroundJobReceiptQuery");
var BackgroundJobReceiptPollErrorType;
(function (BackgroundJobReceiptPollErrorType) {
    BackgroundJobReceiptPollErrorType[BackgroundJobReceiptPollErrorType["NULL_RECEIPT"] = 0] = "NULL_RECEIPT";
    BackgroundJobReceiptPollErrorType[BackgroundJobReceiptPollErrorType["JOB_FAILED_NO_WILL_RETRY"] = 1] = "JOB_FAILED_NO_WILL_RETRY";
    BackgroundJobReceiptPollErrorType[BackgroundJobReceiptPollErrorType["TIMEOUT"] = 2] = "TIMEOUT";
})(BackgroundJobReceiptPollErrorType || (exports.BackgroundJobReceiptPollErrorType = BackgroundJobReceiptPollErrorType = {}));
class BackgroundJobReceiptPollError extends Error {
    errorData;
    constructor(errorData) {
        super(BackgroundJobReceiptPollError.createErrorMessage(errorData));
        this.errorData = errorData;
    }
    static createErrorMessage(errorData) {
        switch (errorData.errorType) {
            case BackgroundJobReceiptPollErrorType.NULL_RECEIPT:
                return 'Background job receipt was null.';
            case BackgroundJobReceiptPollErrorType.JOB_FAILED_NO_WILL_RETRY:
                return `Background job failed with error: ${errorData.receiptErrorMessage}`;
            case BackgroundJobReceiptPollErrorType.TIMEOUT:
                return 'Background job timed out.';
        }
    }
}
exports.BackgroundJobReceiptPollError = BackgroundJobReceiptPollError;
async function fetchBackgroundJobReceiptAsync(graphqlClient, receiptId) {
    try {
        return [await BackgroundJobReceiptQuery_1.BackgroundJobReceiptQuery.byIdAsync(graphqlClient, receiptId), null];
    }
    catch (error) {
        if (error instanceof core_1.CombinedError) {
            return [null, error];
        }
        throw error;
    }
}
async function pollForBackgroundJobReceiptAsync(graphqlClient, backgroundJobReceipt, options) {
    return await new Promise((resolve, reject) => {
        let numChecks = 0;
        const intervalHandle = (0, set_interval_async_1.setIntervalAsync)(async function pollForDeletionFinishedAsync() {
            function failBackgroundDeletion(error) {
                void (0, set_interval_async_1.clearIntervalAsync)(intervalHandle);
                reject(error);
            }
            const [receipt, error] = await fetchBackgroundJobReceiptAsync(graphqlClient, backgroundJobReceipt.id);
            if (!receipt) {
                if (error instanceof core_1.CombinedError) {
                    const errorResult = options?.onBackgroundJobReceiptPollError?.(error);
                    if (errorResult?.errorIndicatesSuccess) {
                        void (0, set_interval_async_1.clearIntervalAsync)(intervalHandle);
                        resolve(null);
                        return;
                    }
                }
                failBackgroundDeletion(new BackgroundJobReceiptPollError({
                    errorType: BackgroundJobReceiptPollErrorType.NULL_RECEIPT,
                }));
                return;
            }
            // job failed and will not retry
            if (receipt.state === generated_1.BackgroundJobState.Failure && !receipt.willRetry) {
                failBackgroundDeletion(new BackgroundJobReceiptPollError({
                    errorType: BackgroundJobReceiptPollErrorType.JOB_FAILED_NO_WILL_RETRY,
                    receiptErrorMessage: receipt.errorMessage,
                }));
                return;
            }
            // all else fails, stop polling after 90 checks. This should only happen if there's an
            // issue with receipts not setting `willRetry` to false when they fail within a reasonable
            // amount of time.
            if (numChecks > 90) {
                failBackgroundDeletion(new BackgroundJobReceiptPollError({
                    errorType: BackgroundJobReceiptPollErrorType.TIMEOUT,
                }));
                return;
            }
            if (receipt.state === generated_1.BackgroundJobState.Success) {
                void (0, set_interval_async_1.clearIntervalAsync)(intervalHandle);
                resolve(receipt);
                return;
            }
            numChecks++;
        }, options?.pollInterval ?? 1000);
    });
}
