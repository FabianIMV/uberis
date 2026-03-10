import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { BackgroundJobReceiptDataFragment } from '../graphql/generated';
export declare function scheduleUpdateGroupDeletionAsync(graphqlClient: ExpoGraphqlClient, { group, }: {
    group: string;
}): Promise<BackgroundJobReceiptDataFragment>;
