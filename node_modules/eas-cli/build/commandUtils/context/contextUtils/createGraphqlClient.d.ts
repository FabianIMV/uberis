import { Client } from '@urql/core';
export interface ExpoGraphqlClient extends Client {
}
export declare function createGraphqlClient(authInfo: {
    accessToken: string | null;
    sessionSecret: string | null;
}): ExpoGraphqlClient;
