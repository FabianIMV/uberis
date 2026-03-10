import EasCommand from '../../commandUtils/EasCommand';
import { EndOutcome } from '../../rollout/actions/EndRollout';
declare enum ActionRawFlagValue {
    CREATE = "create",
    EDIT = "edit",
    END = "end",
    VIEW = "view"
}
export default class ChannelRollout extends EasCommand {
    static description: string;
    static args: {
        channel: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        action: import("@oclif/core/lib/interfaces").OptionFlag<ActionRawFlagValue | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        percent: import("@oclif/core/lib/interfaces").OptionFlag<number | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        outcome: import("@oclif/core/lib/interfaces").OptionFlag<EndOutcome | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        branch: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'runtime-version': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'private-key-path': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        vcsClient: import("../../commandUtils/context/VcsClientContextField").default;
        privateProjectConfig: import("../../commandUtils/context/PrivateProjectConfigContextField").PrivateProjectConfigContextField;
    };
    runAsync(): Promise<void>;
    private getAction;
    private sanitizeArgsAndFlags;
}
export {};
