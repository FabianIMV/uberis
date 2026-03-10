import { Response } from 'node-fetch';
import { ExpoGraphqlClient } from './commandUtils/context/contextUtils/createGraphqlClient';
import { AccountUploadSessionType, UploadSessionType } from './graphql/generated';
import { ProgressHandler } from './utils/progress';
export interface PresignedPost {
    url: string;
    fields: Record<string, string>;
}
export declare function uploadFileAtPathToGCSAsync(graphqlClient: ExpoGraphqlClient, type: UploadSessionType, path: string, handleProgressEvent?: ProgressHandler): Promise<string>;
export declare function uploadAccountScopedFileAtPathToGCSAsync(graphqlClient: ExpoGraphqlClient, { type, accountId, path, handleProgressEvent, }: {
    type: AccountUploadSessionType;
    accountId: string;
    path: string;
    handleProgressEvent: ProgressHandler;
}): Promise<string>;
export declare function uploadWithPresignedPostWithRetryAsync(file: string, presignedPost: PresignedPost, onAssetUploadBegin: () => void): Promise<Response>;
