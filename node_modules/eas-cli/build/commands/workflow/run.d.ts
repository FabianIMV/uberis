/**
 * EAS Workflow Run Command
 *
 * This command runs an EAS workflow with support for interactive input prompting.
 *
 * Input Sources (in order of precedence):
 * 1. Command line flags (-F key=value)
 * 2. STDIN JSON input (echo '{"key": "value"}' | eas workflow:run)
 * 3. Interactive prompts (when required inputs are missing and not in non-interactive mode)
 *
 * Interactive Prompting:
 * - When running in interactive mode (default), the command will automatically prompt
 *   for any required inputs that are not provided via flags or STDIN
 * - Input types supported: string, boolean, number, choice, environment
 * - Each input type has appropriate validation and default values
 * - Use --non-interactive flag to disable prompting and require all inputs via flags
 *
 * Example workflow with inputs:
 * ```yaml
 * on:
 *   workflow_dispatch:
 *     inputs:
 *       environment:
 *         type: string
 *         required: true
 *         description: "Environment to deploy to"
 *       debug:
 *         type: boolean
 *         default: false
 *         description: "Enable debug mode"
 *       version:
 *         type: number
 *         required: true
 *         description: "Version number"
 *       deployment_type:
 *         type: choice
 *         options: ["staging", "production"]
 *         default: "staging"
 *         description: "Type of deployment"
 * ```
 */
import EasCommand from '../../commandUtils/EasCommand';
export default class WorkflowRun extends EasCommand {
    static description: string;
    static args: {
        file: import("@oclif/core/lib/interfaces").Arg<string, Record<string, unknown>>;
    };
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        wait: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        input: import("@oclif/core/lib/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        ref: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
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
