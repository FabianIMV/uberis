import { ExpoConfig } from '@expo/config';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { AccountFragment } from '../graphql/generated';
import { Actor } from '../user/User';
export declare function getUsernameForBuildMetadataAndBuildJob(user: Actor): string | undefined;
/**
 * Return a useful name describing the project config.
 * - dynamic: app.config.js
 * - static: app.json
 * - custom path app config relative to root folder
 * - both: app.config.js or app.json
 */
export declare function getProjectConfigDescription(projectDir: string): string;
export declare function isExpoUpdatesInstalled(projectDir: string): boolean;
export declare function isExpoNotificationsInstalled(projectDir: string): boolean;
export declare function isExpoInstalled(projectDir: string): boolean;
export declare function isExpoUpdatesInstalledAsDevDependency(projectDir: string): boolean;
export declare function isExpoUpdatesInstalledOrAvailable(projectDir: string, sdkVersion?: string): boolean;
export declare function isUsingEASUpdate(exp: ExpoConfig, projectId: string, manifestHostOverride: string | null): boolean;
export declare function getExpoUpdatesPackageVersionIfInstalledAsync(projectDir: string): Promise<string | null>;
export declare function validateAppVersionRuntimePolicySupportAsync(projectDir: string, exp: ExpoConfig): Promise<void>;
export declare function enforceRollBackToEmbeddedUpdateSupportAsync(projectDir: string): Promise<void>;
export declare function isModernExpoUpdatesCLIWithRuntimeVersionCommandSupportedAsync(projectDir: string): Promise<boolean>;
export declare function installExpoUpdatesAsync(projectDir: string, options?: {
    silent: boolean;
}): Promise<void>;
export declare function getOwnerAccountForProjectIdAsync(graphqlClient: ExpoGraphqlClient, projectId: string): Promise<AccountFragment>;
export declare function getDisplayNameForProjectIdAsync(graphqlClient: ExpoGraphqlClient, projectId: string): Promise<string>;
