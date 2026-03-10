import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { BackgroundJobReceiptDataFragment } from '../graphql/generated';
export declare function scheduleBranchDeletionAsync(graphqlClient: ExpoGraphqlClient, { branchId, }: {
    branchId: string;
}): Promise<BackgroundJobReceiptDataFragment>;
