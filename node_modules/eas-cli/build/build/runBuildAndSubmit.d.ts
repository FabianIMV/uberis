import { Env } from '@expo/eas-build-job';
import { ResourceClass } from '@expo/eas-json';
import { LoggerLevel } from '@expo/logger';
import { LocalBuildOptions } from './local';
import { Analytics } from '../analytics/AnalyticsManager';
import { DynamicConfigContextFn } from '../commandUtils/context/DynamicProjectConfigContextField';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { BuildFragment } from '../graphql/generated';
import { RequestedPlatform } from '../platform';
import { Actor } from '../user/User';
import { ProfileData } from '../utils/profiles';
import { Client } from '../vcs/vcs';
export interface BuildFlags {
    requestedPlatform: RequestedPlatform;
    profile?: string;
    nonInteractive: boolean;
    wait: boolean;
    clearCache: boolean;
    json: boolean;
    autoSubmit: boolean;
    submitProfile?: string;
    localBuildOptions: LocalBuildOptions;
    resourceClass?: ResourceClass;
    message?: string;
    buildLoggerLevel?: LoggerLevel;
    freezeCredentials: boolean;
    isVerboseLoggingEnabled?: boolean;
    whatToTest?: string;
}
export declare function runBuildAndSubmitAsync({ graphqlClient, analytics, vcsClient, projectDir, flags, actor, getDynamicPrivateProjectConfigAsync, downloadSimBuildAutoConfirm, envOverride, }: {
    graphqlClient: ExpoGraphqlClient;
    analytics: Analytics;
    vcsClient: Client;
    projectDir: string;
    flags: BuildFlags;
    actor: Actor;
    getDynamicPrivateProjectConfigAsync: DynamicConfigContextFn;
    downloadSimBuildAutoConfirm?: boolean;
    envOverride?: Env;
}): Promise<{
    buildIds: string[];
    buildProfiles?: ProfileData<'build'>[];
}>;
export declare function downloadAndRunAsync(build: BuildFragment): Promise<void>;
