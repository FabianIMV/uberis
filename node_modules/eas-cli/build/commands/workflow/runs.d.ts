import EasCommand from '../../commandUtils/EasCommand';
import { WorkflowRunStatus } from '../../graphql/generated';
export default class WorkflowRunList extends EasCommand {
    static description: string;
    static flags: {
        limit: import("@oclif/core/lib/interfaces").OptionFlag<number | undefined>;
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        workflow: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        status: import("@oclif/core/lib/interfaces").OptionFlag<WorkflowRunStatus | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    runAsync(): Promise<void>;
}
