import EasCommand from '../../commandUtils/EasCommand';
import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { RequestedPlatform } from '../../platform';
export declare function selectBuildToCancelAsync(graphqlClient: ExpoGraphqlClient, projectId: string, projectDisplayName: string, filters?: {
    platform?: RequestedPlatform;
    profile?: string;
}): Promise<string | null>;
export default class BuildCancel extends EasCommand {
    static description: string;
    static args: {
        BUILD_ID: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static flags: {
        platform: import("@oclif/core/lib/interfaces").OptionFlag<RequestedPlatform | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        profile: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    static contextDefinition: {
        vcsClient: import("../../commandUtils/context/VcsClientContextField").default;
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    runAsync(): Promise<void>;
}
