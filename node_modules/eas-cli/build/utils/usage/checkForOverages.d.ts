import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
export declare function maybeWarnAboutUsageOveragesAsync({ graphqlClient, accountId, }: {
    graphqlClient: ExpoGraphqlClient;
    accountId: string;
}): Promise<void>;
export declare function calculatePercentUsed(value: number, limit: number): number;
export declare function createProgressBar(percentUsed: number, width?: number): string;
export declare function displayOverageWarning({ percentUsed, hasFreePlan, name, }: {
    percentUsed: number;
    hasFreePlan: boolean;
    name: string;
}): void;
