import EasCommand from '../../commandUtils/EasCommand';
export default class EnvExec extends EasCommand {
    static description: string;
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    static flags: {
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    static args: {
        environment: import("@oclif/core/lib/interfaces").Arg<string, Record<string, unknown>>;
        bash_command: import("@oclif/core/lib/interfaces").Arg<string, Record<string, unknown>>;
    };
    private isNonInteractive;
    runAsync(): Promise<void>;
    private sanitizeFlagsAndArgs;
    protected catch(err: Error): Promise<any>;
    private runCommandNonInteractiveWithEnvVarsAsync;
    private runCommandWithEnvVarsAsync;
    private loadEnvironmentVariablesAsync;
}
