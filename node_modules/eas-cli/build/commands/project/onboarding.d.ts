import EasCommand from '../../commandUtils/EasCommand';
export default class Onboarding extends EasCommand {
    static aliases: string[];
    static description: string;
    static flags: {};
    static args: {
        TARGET_PROJECT_DIRECTORY: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static contextDefinition: {
        analytics: import("../../commandUtils/context/AnalyticsContextField").default;
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
    };
    runAsync(): Promise<void>;
}
