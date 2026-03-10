import { ExpoGraphqlClient } from '../../../../../commandUtils/context/contextUtils/createGraphqlClient';
import { AppStoreConnectApiKeyFragment, AppStoreConnectApiKeysPaginatedByAccountQuery } from '../../../../../graphql/generated';
export declare const AppStoreConnectApiKeyQuery: {
    getAllForAccountAsync(graphqlClient: ExpoGraphqlClient, accountName: string): Promise<AppStoreConnectApiKeyFragment[]>;
    getAllForAccountPaginatedAsync(graphqlClient: ExpoGraphqlClient, accountName: string, { after, first, before, last, }: {
        after?: string;
        first?: number;
        before?: string;
        last?: number;
    }): Promise<AppStoreConnectApiKeysPaginatedByAccountQuery["account"]["byName"]["appStoreConnectApiKeysPaginated"]>;
};
