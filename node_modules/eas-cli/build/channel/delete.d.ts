import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { BackgroundJobReceiptDataFragment } from '../graphql/generated';
export declare function scheduleChannelDeletionAsync(graphqlClient: ExpoGraphqlClient, { channelId, }: {
    channelId: string;
}): Promise<BackgroundJobReceiptDataFragment>;
