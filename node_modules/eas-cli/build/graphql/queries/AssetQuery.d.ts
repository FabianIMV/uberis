import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { AssetSignedUrlResult } from '../generated';
export declare const AssetQuery: {
    getSignedUrlsAsync(graphqlClient: ExpoGraphqlClient, updateId: string, storageKeys: string[]): Promise<AssetSignedUrlResult[]>;
};
