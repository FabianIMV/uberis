import { ExpoGraphqlClient } from '../../../../../commandUtils/context/contextUtils/createGraphqlClient';
import { AppleTeamFragment, AppleTeamInput, AppleTeamUpdateInput } from '../../../../../graphql/generated';
export declare const AppleTeamMutation: {
    createAppleTeamAsync(graphqlClient: ExpoGraphqlClient, appleTeamInput: AppleTeamInput, accountId: string): Promise<AppleTeamFragment>;
    updateAppleTeamAsync(graphqlClient: ExpoGraphqlClient, appleTeamInput: AppleTeamUpdateInput, appleTeamEntityId: string): Promise<AppleTeamFragment>;
};
