import { Choice } from '../../prompts';
import { Actor } from '../../user/User';
import { ExpoGraphqlClient } from '../context/contextUtils/createGraphqlClient';
export declare function generateProjectConfigAsync(pathArg: string | undefined, options: {
    graphqlClient: ExpoGraphqlClient;
    projectAccount: string;
}): Promise<{
    projectName: string;
    projectDirectory: string;
}>;
export declare function promptForProjectAccountAsync(actor: Actor): Promise<string>;
export declare function getAccountChoices(actor: Actor, permissionsMap?: Map<string, boolean>): Choice[];
/**
 * Finds an available project name that doesn't conflict with either:
 * Local filesystem (directory already exists)
 * Remote server (project already exists on Expo)
 */
export declare function findAvailableProjectNameAsync(baseName: string, parentDirectory: string, { graphqlClient, projectAccount, }: {
    graphqlClient: ExpoGraphqlClient;
    projectAccount: string;
}): Promise<{
    projectName: string;
    projectDirectory: string;
}>;
