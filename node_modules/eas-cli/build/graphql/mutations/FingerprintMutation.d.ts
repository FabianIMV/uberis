import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { FingerprintFragment, FingerprintSourceInput } from '../generated';
export declare const FingerprintMutation: {
    createFingerprintAsync(graphqlClient: ExpoGraphqlClient, appId: string, fingerprintData: {
        hash: string;
        source?: FingerprintSourceInput;
    }): Promise<FingerprintFragment>;
};
