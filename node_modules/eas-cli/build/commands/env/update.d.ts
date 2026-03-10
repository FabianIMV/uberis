import EasCommand from '../../commandUtils/EasCommand';
export default class EnvUpdate extends EasCommand {
    static description: string;
    static flags: {
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        environment: import("@oclif/core/lib/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        scope: import("@oclif/core/lib/interfaces").OptionFlag<"project" | "account", import("@oclif/core/lib/interfaces").CustomOptions>;
        visibility: import("@oclif/core/lib/interfaces").OptionFlag<"plaintext" | "sensitive" | "secret" | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'variable-name': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'variable-environment': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        name: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        value: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        type: import("@oclif/core/lib/interfaces").OptionFlag<"string" | "file" | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static args: {
        environment: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        analytics: import("../../commandUtils/context/AnalyticsContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    runAsync(): Promise<void>;
    private sanitizeInputs;
    private promptForMissingFlagsAsync;
}
