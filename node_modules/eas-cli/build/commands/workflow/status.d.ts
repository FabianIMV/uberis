/**
 * EAS Workflow Status Command
 *
 * This command shows the status of an existing workflow run.
 *
 * If no run ID is provided, you will be prompted to select from recent workflow runs for the current project.
 *
 * If the selected run is still in progress, the command will show the progress of the run, with an option
 * to show periodic status updates while waiting for completion (similar to `eas workflow:run --wait`).
 *
 */
import EasCommand from '../../commandUtils/EasCommand';
export default class WorkflowStatus extends EasCommand {
    static description: string;
    static args: {
        WORKFLOW_RUN_ID: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        wait: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        vcsClient: import("../../commandUtils/context/VcsClientContextField").default;
        projectDir: import("../../commandUtils/context/ProjectDirContextField").default;
        getDynamicPublicProjectConfigAsync: import("../../commandUtils/context/DynamicProjectConfigContextField").DynamicPublicProjectConfigContextField;
        getDynamicPrivateProjectConfigAsync: import("../../commandUtils/context/DynamicProjectConfigContextField").DynamicPrivateProjectConfigContextField;
    };
    runAsync(): Promise<void>;
}
