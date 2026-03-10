import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { UpdateByIdQueryVariables, UpdateFragment, ViewUpdateGroupsOnAppQueryVariables, ViewUpdateGroupsOnBranchQueryVariables, ViewUpdatesByGroupQueryVariables } from '../generated';
export declare const UpdateQuery: {
    viewUpdateGroupAsync(graphqlClient: ExpoGraphqlClient, { groupId }: ViewUpdatesByGroupQueryVariables): Promise<UpdateFragment[]>;
    viewUpdateGroupsOnBranchAsync(graphqlClient: ExpoGraphqlClient, { limit, offset, appId, branchName, filter }: ViewUpdateGroupsOnBranchQueryVariables): Promise<UpdateFragment[][]>;
    viewUpdateGroupsOnAppAsync(graphqlClient: ExpoGraphqlClient, { limit, offset, appId, filter }: ViewUpdateGroupsOnAppQueryVariables): Promise<UpdateFragment[][]>;
    viewByUpdateAsync(graphqlClient: ExpoGraphqlClient, { updateId }: UpdateByIdQueryVariables): Promise<UpdateFragment>;
};
