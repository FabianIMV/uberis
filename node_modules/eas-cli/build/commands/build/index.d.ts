import { ResourceClass } from '@expo/eas-json';
import { LoggerLevel } from '@expo/logger';
import EasCommand from '../../commandUtils/EasCommand';
export default class Build extends EasCommand {
    static description: string;
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        platform: import("@oclif/core/lib/interfaces").OptionFlag<"android" | "ios" | "all" | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'skip-credentials-check': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'skip-project-configuration': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        profile: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        local: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        output: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        wait: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'clear-cache': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'auto-submit': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'auto-submit-with-profile': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'what-to-test': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'resource-class': import("@oclif/core/lib/interfaces").OptionFlag<ResourceClass | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        message: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'build-logger-level': import("@oclif/core/lib/interfaces").OptionFlag<LoggerLevel | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'freeze-credentials': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'verbose-logs': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    static contextDefinition: {
        vcsClient: import("../../commandUtils/context/VcsClientContextField").default;
        analytics: import("../../commandUtils/context/AnalyticsContextField").default;
        projectDir: import("../../commandUtils/context/ProjectDirContextField").default;
        getDynamicPublicProjectConfigAsync: import("../../commandUtils/context/DynamicProjectConfigContextField").DynamicPublicProjectConfigContextField;
        getDynamicPrivateProjectConfigAsync: import("../../commandUtils/context/DynamicProjectConfigContextField").DynamicPrivateProjectConfigContextField;
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
    };
    runAsync(): Promise<void>;
    private sanitizeFlags;
    private ensurePlatformSelectedAsync;
    private maybeSuggestUsingEasBuildDev;
}
export declare function handleDeprecatedEasJsonAsync(projectDir: string, nonInteractive: boolean): Promise<void>;
