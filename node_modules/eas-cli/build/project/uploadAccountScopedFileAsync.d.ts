import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
/**
 * Uploads a file to GCS as account-scoped object.
 * Used in workflows. Takes care of logging progress.
 * (Uses file name when mentioning file in logs.)
 */
export declare function uploadAccountScopedFileAsync({ graphqlClient, accountId, filePath, maxSizeBytes, }: {
    graphqlClient: ExpoGraphqlClient;
    accountId: string;
    filePath: string;
    maxSizeBytes: number;
}): Promise<{
    fileBucketKey: string;
}>;
