import { Platform } from '@expo/eas-build-job';
import { Fingerprint } from './types';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { AppPlatform } from '../graphql/generated';
import { Client } from '../vcs/vcs';
export declare function getFingerprintInfoFromLocalProjectForPlatformsAsync(graphqlClient: ExpoGraphqlClient, projectDir: string, projectId: string, vcsClient: Client, platforms: AppPlatform[], { env }?: {
    env?: Record<string, string>;
}): Promise<Fingerprint>;
export declare function appPlatformToPlatform(platform: AppPlatform): Platform;
export declare function appPlatformToString(platform: AppPlatform): string;
export declare function stringToAppPlatform(platform: string): AppPlatform;
