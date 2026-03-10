import { CombinedError } from '@urql/core';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { BackgroundJobReceiptDataFragment } from '../graphql/generated';
export declare enum BackgroundJobReceiptPollErrorType {
    NULL_RECEIPT = 0,
    JOB_FAILED_NO_WILL_RETRY = 1,
    TIMEOUT = 2
}
export type BackgroundJobReceiptPollErrorData = {
    errorType: BackgroundJobReceiptPollErrorType.NULL_RECEIPT;
} | {
    errorType: BackgroundJobReceiptPollErrorType.JOB_FAILED_NO_WILL_RETRY;
    receiptErrorMessage: string | undefined | null;
} | {
    errorType: BackgroundJobReceiptPollErrorType.TIMEOUT;
};
export declare class BackgroundJobReceiptPollError extends Error {
    readonly errorData: BackgroundJobReceiptPollErrorData;
    constructor(errorData: BackgroundJobReceiptPollErrorData);
    static createErrorMessage(errorData: BackgroundJobReceiptPollErrorData): string;
}
export type BackgroundJobPollErrorCondition = (error: CombinedError) => {
    errorIndicatesSuccess: boolean;
};
export declare function pollForBackgroundJobReceiptAsync(graphqlClient: ExpoGraphqlClient, backgroundJobReceipt: BackgroundJobReceiptDataFragment): Promise<BackgroundJobReceiptDataFragment>;
export declare function pollForBackgroundJobReceiptAsync(graphqlClient: ExpoGraphqlClient, backgroundJobReceipt: BackgroundJobReceiptDataFragment, options?: {
    onBackgroundJobReceiptPollError?: BackgroundJobPollErrorCondition;
    pollInterval?: number;
}): Promise<BackgroundJobReceiptDataFragment | null>;
