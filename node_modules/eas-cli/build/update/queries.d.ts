import { UpdatePublishPlatform } from './utils';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { PaginatedQueryOptions } from '../commandUtils/pagination';
import { RuntimeFragment, UpdateFragment, ViewUpdateGroupsOnAppQueryVariables, ViewUpdateGroupsOnBranchQueryVariables } from '../graphql/generated';
export declare const UPDATES_LIMIT = 50;
export declare const UPDATE_GROUPS_LIMIT = 25;
export declare const RUNTIME_VERSIONS_LIMIT = 25;
export declare function listAndRenderUpdateGroupsOnAppAsync(graphqlClient: ExpoGraphqlClient, { projectId, filter, paginatedQueryOptions, }: {
    projectId: string;
    filter?: ViewUpdateGroupsOnAppQueryVariables['filter'];
    paginatedQueryOptions: PaginatedQueryOptions;
}): Promise<void>;
export declare function listAndRenderUpdateGroupsOnBranchAsync(graphqlClient: ExpoGraphqlClient, { projectId, branchName, filter, paginatedQueryOptions, }: {
    projectId: string;
    branchName: string;
    filter?: ViewUpdateGroupsOnBranchQueryVariables['filter'];
    paginatedQueryOptions: PaginatedQueryOptions;
}): Promise<void>;
export declare function selectRuntimeAndGetLatestUpdateGroupForEachPublishPlatformOnBranchAsync(graphqlClient: ExpoGraphqlClient, { projectId, branchName, paginatedQueryOptions, }: {
    projectId: string;
    branchName: string;
    paginatedQueryOptions: PaginatedQueryOptions;
}): Promise<Record<UpdatePublishPlatform, UpdateFragment[] | undefined>>;
export declare function selectUpdateGroupOnBranchAsync(graphqlClient: ExpoGraphqlClient, { projectId, branchName, paginatedQueryOptions, }: {
    projectId: string;
    branchName: string;
    paginatedQueryOptions: PaginatedQueryOptions;
}): Promise<UpdateFragment[]>;
export declare function selectRuntimeOnBranchAsync(graphqlClient: ExpoGraphqlClient, { appId, branchName, batchSize, }: {
    appId: string;
    branchName: string;
    batchSize?: number;
}): Promise<RuntimeFragment | null>;
