import type { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { type PaginatedWorkerDeploymentsQueryVariables, SuggestedDevDomainNameQueryVariables, type WorkerDeploymentAliasFragment, type WorkerDeploymentFragment } from '../graphql/generated';
import type { Connection } from '../utils/relay';
export declare const DeploymentsQuery: {
    getAllDeploymentsPaginatedAsync(graphqlClient: ExpoGraphqlClient, { appId, first, after, last, before }: PaginatedWorkerDeploymentsQueryVariables): Promise<Connection<WorkerDeploymentFragment>>;
    getSuggestedDevDomainByAppIdAsync(graphqlClient: ExpoGraphqlClient, { appId }: SuggestedDevDomainNameQueryVariables): Promise<string>;
    getAllAliasesPaginatedAsync(graphqlClient: ExpoGraphqlClient, { appId, first, after, last, before, }: {
        appId: string;
        first?: number;
        after?: string;
        last?: number;
        before?: string;
    }): Promise<Connection<WorkerDeploymentAliasFragment>>;
};
