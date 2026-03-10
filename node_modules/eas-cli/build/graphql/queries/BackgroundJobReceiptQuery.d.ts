import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { BackgroundJobReceiptByIdQuery } from '../generated';
export declare const BackgroundJobReceiptQuery: {
    byIdAsync(graphqlClient: ExpoGraphqlClient, backgroundJobReceiptId: string): Promise<BackgroundJobReceiptByIdQuery["backgroundJobReceipt"]["byId"] | null>;
};
