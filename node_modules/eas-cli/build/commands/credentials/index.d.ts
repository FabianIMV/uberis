import EasCommand from '../../commandUtils/EasCommand';
export default class Credentials extends EasCommand {
    static description: string;
    static flags: {
        platform: import("@oclif/core/lib/interfaces").OptionFlag<"android" | "ios" | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        vcsClient: import("../../commandUtils/context/VcsClientContextField").default;
        analytics: import("../../commandUtils/context/AnalyticsContextField").default;
        getDynamicPublicProjectConfigAsync: import("../../commandUtils/context/DynamicProjectConfigContextField").DynamicPublicProjectConfigContextField;
        getDynamicPrivateProjectConfigAsync: import("../../commandUtils/context/DynamicProjectConfigContextField").DynamicPrivateProjectConfigContextField;
        optionalPrivateProjectConfig: import("../../commandUtils/context/OptionalPrivateProjectConfigContextField").OptionalPrivateProjectConfigContextField;
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
    };
    runAsync(): Promise<void>;
}
