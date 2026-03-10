import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { AccountUploadSessionType, UploadSessionType } from '../generated';
export interface SignedUrl {
    url: string;
    headers: Record<string, string>;
    bucketKey: string;
}
export declare const UploadSessionMutation: {
    createUploadSessionAsync(graphqlClient: ExpoGraphqlClient, type: UploadSessionType, filename?: string): Promise<SignedUrl>;
    createAccountScopedUploadSessionAsync(graphqlClient: ExpoGraphqlClient, { type, accountID, }: {
        type: AccountUploadSessionType;
        accountID: string;
    }): Promise<SignedUrl>;
};
