import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { Client } from '../vcs/vcs';
/**
 * Archives the project and uploads it to GCS as account-scoped object.
 * Used in workflows. Takes care of logging progress and cleaning up the tarball.
 */
export declare function uploadAccountScopedProjectSourceAsync({ graphqlClient, vcsClient, accountId, }: {
    graphqlClient: ExpoGraphqlClient;
    vcsClient: Client;
    accountId: string;
}): Promise<{
    projectArchiveBucketKey: string;
}>;
