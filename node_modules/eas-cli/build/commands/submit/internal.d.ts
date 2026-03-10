import { Platform } from '@expo/eas-build-job';
import EasCommand from '../../commandUtils/EasCommand';
/**
 * This command will be run on the EAS workers.
 * This command resolves credentials and other
 * configuration, that normally would be included in the
 * job and metadata objects, and prints them to stdout.
 */
export default class SubmitInternal extends EasCommand {
    static hidden: boolean;
    static flags: {
        platform: import("@oclif/core/lib/interfaces").OptionFlag<Platform, import("@oclif/core/lib/interfaces").CustomOptions>;
        profile: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        id: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        vcsClient: import("../../commandUtils/context/VcsClientContextField").default;
        analytics: import("../../commandUtils/context/AnalyticsContextField").default;
        projectDir: import("../../commandUtils/context/ProjectDirContextField").default;
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        privateProjectConfig: import("../../commandUtils/context/PrivateProjectConfigContextField").PrivateProjectConfigContextField;
    };
    runAsync(): Promise<void>;
}
