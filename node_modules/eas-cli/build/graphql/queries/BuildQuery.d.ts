import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { BuildFragment, BuildWithFingerprintFragment, BuildWithSubmissionsFragment, ViewBuildsOnAppQueryVariables } from '../generated';
export declare const BuildQuery: {
    byIdAsync(graphqlClient: ExpoGraphqlClient, buildId: string, { useCache }?: {
        useCache?: boolean;
    }): Promise<BuildFragment>;
    withSubmissionsByIdAsync(graphqlClient: ExpoGraphqlClient, buildId: string, { useCache }?: {
        useCache?: boolean;
    }): Promise<BuildWithSubmissionsFragment>;
    withFingerprintByIdAsync(graphqlClient: ExpoGraphqlClient, buildId: string, { useCache }?: {
        useCache?: boolean;
    }): Promise<BuildWithFingerprintFragment>;
    viewBuildsOnAppAsync(graphqlClient: ExpoGraphqlClient, { appId, limit, offset, filter }: ViewBuildsOnAppQueryVariables): Promise<BuildFragment[]>;
};
