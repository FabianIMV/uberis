import { ExpoGraphqlClient } from '../../../../../commandUtils/context/contextUtils/createGraphqlClient';
import { GoogleServiceAccountKeyFragment, GoogleServiceAccountKeysPaginatedByAccountQuery } from '../../../../../graphql/generated';
export declare const GoogleServiceAccountKeyQuery: {
    getAllForAccountAsync(graphqlClient: ExpoGraphqlClient, accountName: string): Promise<GoogleServiceAccountKeyFragment[]>;
    getAllForAccountPaginatedAsync(graphqlClient: ExpoGraphqlClient, accountName: string, { after, first, before, last, }: {
        after?: string;
        first?: number;
        before?: string;
        last?: number;
    }): Promise<GoogleServiceAccountKeysPaginatedByAccountQuery["account"]["byName"]["googleServiceAccountKeysPaginated"]>;
};
