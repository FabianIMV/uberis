import { Client } from '../vcs/vcs';
interface ConfigureParams {
    projectDir: string;
    nonInteractive: boolean;
    vcsClient: Client;
}
export declare function easJsonExistsAsync(projectDir: string): Promise<boolean>;
/**
 * Creates eas.json if it does not exist.
 *
 * Returns:
 * - false - if eas.json already exists
 * - true - if eas.json was created by the function
 */
export declare function ensureProjectConfiguredAsync(configureParams: ConfigureParams): Promise<boolean>;
export declare function doesBuildProfileExistAsync({ projectDir, profileName, }: {
    projectDir: string;
    profileName: string;
}): Promise<boolean>;
export declare function createBuildProfileAsync({ projectDir, profileName, profileContents, vcsClient, nonInteractive, }: {
    projectDir: string;
    profileName: string;
    profileContents: Record<string, any>;
    vcsClient: Client;
    nonInteractive: boolean;
}): Promise<void>;
export {};
