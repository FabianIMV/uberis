import EasCommand from '../../commandUtils/EasCommand';
import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { UpdateChannelBasicInfoFragment, UpdateChannelBranchMappingMutationVariables } from '../../graphql/generated';
export declare function updateChannelBranchMappingAsync(graphqlClient: ExpoGraphqlClient, { channelId, branchMapping }: UpdateChannelBranchMappingMutationVariables): Promise<UpdateChannelBasicInfoFragment>;
export default class ChannelEdit extends EasCommand {
    static description: string;
    static args: {
        name: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        branch: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    runAsync(): Promise<void>;
}
