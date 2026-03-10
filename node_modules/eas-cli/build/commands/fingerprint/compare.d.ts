import EasCommand from '../../commandUtils/EasCommand';
export default class FingerprintCompare extends EasCommand {
    static description: string;
    static strict: boolean;
    static examples: string[];
    static args: {
        hash1: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
        hash2: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'build-id': import("@oclif/core/lib/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'update-id': import("@oclif/core/lib/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        open: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        environment: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        getServerSideEnvironmentVariablesAsync: import("../../commandUtils/context/ServerSideEnvironmentVariablesContextField").ServerSideEnvironmentVariablesContextField;
        vcsClient: import("../../commandUtils/context/VcsClientContextField").default;
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        privateProjectConfig: import("../../commandUtils/context/PrivateProjectConfigContextField").PrivateProjectConfigContextField;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    runAsync(): Promise<void>;
}
