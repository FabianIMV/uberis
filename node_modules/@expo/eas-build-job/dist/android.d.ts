import { LoggerLevel } from '@expo/logger';
import Joi from 'joi';
import { ArchiveSource, BuildMode, BuildTrigger, Cache, Env, EnvironmentSecret, Hooks, Platform, StaticWorkflowInterpolationContext, Workflow } from './common';
import { Step } from './step';
export interface Keystore {
    dataBase64: string;
    keystorePassword: string;
    keyAlias: string;
    keyPassword?: string;
}
export declare enum BuildType {
    APK = "apk",
    APP_BUNDLE = "app-bundle"
}
export interface BuilderEnvironment {
    image?: string;
    node?: string;
    corepack?: boolean;
    pnpm?: string;
    yarn?: string;
    bun?: string;
    ndk?: string;
    env?: Env;
}
export interface BuildSecrets {
    buildCredentials?: {
        keystore: Keystore;
    };
    environmentSecrets?: EnvironmentSecret[];
    robotAccessToken?: string;
}
export interface Job {
    mode: BuildMode;
    type: Workflow;
    triggeredBy: BuildTrigger;
    projectArchive: ArchiveSource;
    platform: Platform.ANDROID;
    projectRootDirectory: string;
    buildProfile?: string;
    updates?: {
        channel?: string;
    };
    secrets?: BuildSecrets;
    builderEnvironment?: BuilderEnvironment;
    cache?: Cache;
    developmentClient?: boolean;
    version?: {
        versionCode?: string;
        /**
         * support for this field is implemented, but specifying it is disabled on schema level
         */
        versionName?: string;
        /**
         * support for this field is implemented, but specifying it is disabled on schema level
         */
        runtimeVersion?: string;
    };
    buildArtifactPaths?: string[];
    gradleCommand?: string;
    applicationArchivePath?: string;
    buildType?: BuildType;
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
