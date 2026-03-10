import EasCommand from '../../commandUtils/EasCommand';
import { EnvironmentSecretScope } from '../../graphql/queries/EnvironmentSecretsQuery';
export default class EnvironmentSecretPush extends EasCommand {
    static description: string;
    static hidden: boolean;
    static flags: {
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        scope: import("@oclif/core/lib/interfaces").OptionFlag<EnvironmentSecretScope, import("@oclif/core/lib/interfaces").CustomOptions>;
        'env-file': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        force: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    runAsync(): Promise<void>;
}
