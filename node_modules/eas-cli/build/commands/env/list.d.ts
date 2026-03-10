import EasCommand from '../../commandUtils/EasCommand';
export default class EnvList extends EasCommand {
    static description: string;
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    static flags: {
        scope: import("@oclif/core/lib/interfaces").OptionFlag<"project" | "account", import("@oclif/core/lib/interfaces").CustomOptions>;
        format: import("@oclif/core/lib/interfaces").OptionFlag<"long" | "short", import("@oclif/core/lib/interfaces").CustomOptions>;
        environment: import("@oclif/core/lib/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'include-sensitive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'include-file-content': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    static args: {
        environment: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    runAsync(): Promise<void>;
    private sanitizeInputs;
}
