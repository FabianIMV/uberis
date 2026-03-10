import { LocalBuildMode } from '../build/local';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { FingerprintSourceInput } from '../graphql/generated';
export declare function maybeUploadFingerprintAsync({ hash, fingerprint, graphqlClient, localBuildMode, }: {
    hash: string;
    fingerprint: {
        fingerprintSources: object[];
        isDebugFingerprintSource: boolean;
    };
    graphqlClient: ExpoGraphqlClient;
    localBuildMode?: LocalBuildMode;
}): Promise<{
    hash: string;
    fingerprintSource?: FingerprintSourceInput;
}>;
