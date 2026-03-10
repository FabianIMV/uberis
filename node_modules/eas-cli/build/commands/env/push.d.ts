import EasCommand from '../../commandUtils/EasCommand';
export default class EnvPush extends EasCommand {
    static description: string;
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    static flags: {
        path: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
        force: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        environment: import("@oclif/core/lib/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static args: {
        environment: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    runAsync(): Promise<void>;
    parseFlagsAndArgs(flags: {
        path: string;
        environment: string[] | undefined;
        force: boolean;
    }, { environment }: {
        environment?: string;
    }): {
        environment?: string[];
        path: string;
        force: boolean;
    };
    private parseEnvFileAsync;
}
