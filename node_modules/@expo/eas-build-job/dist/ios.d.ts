import { LoggerLevel } from '@expo/logger';
import Joi from 'joi';
import { ArchiveSource, BuildMode, BuildTrigger, Cache, Env, EnvironmentSecret, Hooks, Platform, StaticWorkflowInterpolationContext, Workflow } from './common';
import { Step } from './step';
export type DistributionType = 'store' | 'internal' | 'simulator';
export interface TargetCredentials {
    provisioningProfileBase64: string;
    distributionCertificate: DistributionCertificate;
}
type Target = string;
export type BuildCredentials = Record<Target, TargetCredentials>;
export interface DistributionCertificate {
    dataBase64: string;
    password: string;
}
export interface BuilderEnvironment {
    image?: string;
    node?: string;
    corepack?: boolean;
    yarn?: string;
    bun?: string;
    pnpm?: string;
    bundler?: string;
    fastlane?: string;
    cocoapods?: string;
    env?: Env;
}
export interface BuildSecrets {
    buildCredentials?: BuildCredentials;
    environmentSecrets?: EnvironmentSecret[];
    robotAccessToken?: string;
}
export interface Job {
    mode: BuildMode;
    type: Workflow;
    triggeredBy: BuildTrigger;
    projectArchive: ArchiveSource;
    resign?: {
        applicationArchiveSource: ArchiveSource;
    };
    platform: Platform.IOS;
    projectRootDirectory?: string;
    buildProfile?: string;
    updates?: {
        channel?: string;
    };
    secrets?: BuildSecrets;
    builderEnvironment?: BuilderEnvironment;
    cache?: Cache;
    developmentClient?: boolean;
    simulator?: boolean;
    version?: {
        buildNumber?: string;
        /**
         * support for this field is implemented, but specifying it is disabled on schema level
         */
        appVersion?: string;
        /**
         * support for this field is implemented, but specifying it is disabled on schema level
         */
        runtimeVersion?: string;
    };
    buildArtifactPaths?: string[];
    scheme?: string;
    buildConfiguration?: string;
    applicationArchivePath?: string;
    username?: string;
    customBuildConfig?: {
        path: string;
    };
    hooks?: Hooks;
    steps?: Step[];
    outputs?: Record<string, string>;
    experimental?: {
        prebuildCommand?: string;
    };
    expoBuildUrl?: string;
    githubTriggerOptions?: {
        autoSubmit: boolean;
        submitProfile?: string;
    };
    loggerLevel?: LoggerLevel;
    workflowInterpolationContext?: StaticWorkflowInterpolationContext;
    initiatingUserId: string;
    appId: string;
    environment?: string;
}
export declare const JobSchema: Joi.ObjectSchema<any>;
export {};
