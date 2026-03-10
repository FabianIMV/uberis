import { ExpoGraphqlClient } from './createGraphqlClient';
export declare function loadServerSideEnvironmentVariablesAsync({ environment, projectId, graphqlClient, }: {
    environment: string;
    projectId: string;
    graphqlClient: ExpoGraphqlClient;
}): Promise<Record<string, string>>;
