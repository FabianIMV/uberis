import EasCommand from '../../commandUtils/EasCommand';
import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { AppFragment } from '../../graphql/generated';
import { PackageManager } from '../../onboarding/installDependencies';
import { Actor } from '../../user/User';
export declare function generateConfigsAsync(args: {
    path?: string;
}, actor: Actor, graphqlClient: ExpoGraphqlClient): Promise<{
    projectName: string;
    projectDirectory: string;
    projectAccount: string;
}>;
export declare function createProjectAsync({ graphqlClient, actor, projectDirectory, projectAccount, projectName, }: {
    graphqlClient: ExpoGraphqlClient;
    actor: Actor;
    projectDirectory: string;
    projectAccount: string;
    projectName: string;
}): Promise<string>;
export declare function generateProjectFilesAsync(projectDir: string, app: AppFragment, packageManager: PackageManager): Promise<void>;
export default class New extends EasCommand {
    static aliases: string[];
    static description: string;
    static args: {
        path: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static flags: {
        'package-manager': import("@oclif/core/lib/interfaces").OptionFlag<"npm" | "pnpm" | "bun" | "yarn", import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
    };
    runAsync(): Promise<void>;
}
