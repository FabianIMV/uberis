import { ExpoConfig } from '@expo/config';
import { BuildProfile, Platform } from '@expo/eas-json';
import { AndroidBuildProfile, IosBuildProfile } from '@expo/eas-json/build/build/types';
export declare function buildProfileNamesFromProjectAsync(projectDir: string): Promise<Set<string>>;
export declare function getBuildProfileAsync(projectDir: string, platform: Platform, profileName: string): Promise<BuildProfile<Platform>>;
export declare function buildProfilesFromProjectAsync(projectDir: string): Promise<Map<string, {
    android: AndroidBuildProfile;
    ios: IosBuildProfile;
}>>;
export declare function isBuildProfileForDevelopment(buildProfile: BuildProfile<Platform>, platform: Platform): boolean;
export declare function isIosBuildProfileForSimulator(buildProfile: BuildProfile<Platform.IOS>): boolean;
export declare function addAndroidDevelopmentBuildProfileToEasJsonAsync(projectDir: string, buildProfileName: string): Promise<void>;
export declare function addIosDevelopmentBuildProfileToEasJsonAsync(projectDir: string, buildProfileName: string, simulator: boolean): Promise<void>;
export declare function addProductionBuildProfileToEasJsonIfNeededAsync(projectDir: string): Promise<boolean>;
export declare function hasBuildConfigureBeenRunAsync({ projectDir, expoConfig, }: {
    projectDir: string;
    expoConfig: ExpoConfig;
}): Promise<boolean>;
export declare function hasUpdateConfigureBeenRunAsync({ projectDir, expoConfig, }: {
    projectDir: string;
    expoConfig: ExpoConfig;
}): Promise<boolean>;
/**
 * Runs update:configure if needed. Returns a boolean (proceed with workflow creation, or not)
 */
export declare function runUpdateConfigureIfNeededAsync({ projectDir, expoConfig, }: {
    projectDir: string;
    expoConfig: ExpoConfig;
}): Promise<boolean>;
/**
 * Runs build:configure if needed. Returns a boolean (proceed with workflow creation, or not)
 */
export declare function runBuildConfigureIfNeededAsync({ projectDir, expoConfig, }: {
    projectDir: string;
    expoConfig: ExpoConfig;
}): Promise<boolean>;
