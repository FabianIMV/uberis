import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
export declare const AppMutation: {
    createAppAsync(graphqlClient: ExpoGraphqlClient, appInput: {
        accountId: string;
        projectName: string;
    }): Promise<string>;
};
