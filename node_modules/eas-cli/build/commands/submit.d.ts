import EasCommand from '../commandUtils/EasCommand';
export default class Submit extends EasCommand {
    static description: string;
    static aliases: string[];
    static flags: {
        platform: import("@oclif/core/lib/interfaces").OptionFlag<"android" | "ios" | "all" | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        profile: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        latest: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        id: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        path: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        url: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'what-to-test': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        wait: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'verbose-fastlane': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        groups: import("@oclif/core/lib/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    static contextDefinition: {
        vcsClient: import("../commandUtils/context/VcsClientContextField").default;
        analytics: import("../commandUtils/context/AnalyticsContextField").default;
        projectDir: import("../commandUtils/context/ProjectDirContextField").default;
        loggedIn: import("../commandUtils/context/LoggedInContextField").default;
        privateProjectConfig: import("../commandUtils/context/PrivateProjectConfigContextField").PrivateProjectConfigContextField;
    };
    runAsync(): Promise<void>;
    private sanitizeFlags;
    private ensurePlatformSelectedAsync;
}
