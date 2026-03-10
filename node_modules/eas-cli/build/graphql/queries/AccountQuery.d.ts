import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { AccountFullUsageQuery as AccountFullUsageQueryType, AccountUsageForOverageWarningQuery } from '../generated';
export type AccountFullUsageData = NonNullable<AccountFullUsageQueryType['account']['byId']>;
export declare const AccountQuery: {
    getByNameAsync(graphqlClient: ExpoGraphqlClient, accountName: string): Promise<{
        id: string;
        name: string;
    } | null>;
    getFullUsageAsync(graphqlClient: ExpoGraphqlClient, accountId: string, currentDate: Date, startDate: Date, endDate: Date): Promise<AccountFullUsageData>;
    getUsageForOverageWarningAsync(graphqlClient: ExpoGraphqlClient, accountId: string, currentDate: Date): Promise<AccountUsageForOverageWarningQuery["account"]["byId"]>;
    getBillingPeriodAsync(graphqlClient: ExpoGraphqlClient, accountId: string, currentDate: Date): Promise<{
        start: Date;
        end: Date;
    }>;
};
