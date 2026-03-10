import EasCommand from '../../commandUtils/EasCommand';
import { RequestedPlatform } from '../../platform';
/**
 * Preprocess argv to handle --source-maps with optional value.
 * If --source-maps is followed by another flag (starts with -) or end of args,
 * insert 'true' as the default value.
 */
export declare function preprocessSourceMapsArg(argv: string[]): string[];
export default class UpdatePublish extends EasCommand {
    static description: string;
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        environment: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
        branch: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        channel: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        message: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'input-dir': import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
        'skip-bundler': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'clear-cache': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'no-bytecode': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'source-maps': import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces").CustomOptions>;
        'emit-metadata': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'rollout-percentage': import("@oclif/core/lib/interfaces").OptionFlag<number | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        platform: import("@oclif/core/lib/interfaces").OptionFlag<RequestedPlatform, import("@oclif/core/lib/interfaces").CustomOptions>;
        auto: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'private-key-path': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        getServerSideEnvironmentVariablesAsync: import("../../commandUtils/context/ServerSideEnvironmentVariablesContextField").ServerSideEnvironmentVariablesContextField;
        vcsClient: import("../../commandUtils/context/VcsClientContextField").default;
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        getDynamicPublicProjectConfigAsync: import("../../commandUtils/context/DynamicProjectConfigContextField").DynamicPublicProjectConfigContextField;
        getDynamicPrivateProjectConfigAsync: import("../../commandUtils/context/DynamicProjectConfigContextField").DynamicPrivateProjectConfigContextField;
    };
    runAsync(): Promise<void>;
    private sanitizeFlags;
}
