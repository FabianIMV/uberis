import { ExpoConfig, Platform as ExpoConfigPlatform } from '@expo/config';
import { Env, Platform, Workflow } from '@expo/eas-build-job';
import Joi from 'joi';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { PaginatedQueryOptions } from '../commandUtils/pagination';
import { BuildFragment, FingerprintSourceInput, PartialManifestAsset, UpdateRolloutInfoGroup } from '../graphql/generated';
import { RequestedPlatform } from '../platform';
import { UpdateJsonInfo, UpdatePublishPlatform } from '../update/utils';
import { Client } from '../vcs/vcs';
type Metadata = {
    version: number;
    bundler: 'metro';
    fileMetadata: {
        [key in ExpoConfigPlatform]: {
            assets: {
                path: string;
                ext: string;
            }[];
            bundle: string;
        };
    };
};
export type RawAsset = {
    fileExtension?: string;
    contentType: string;
    path: string;
    /** Original asset path derrived from asset map, or exported folder */
    originalPath?: string;
};
type CollectedAssets = {
    [platform in ExpoConfigPlatform]?: {
        launchAsset: RawAsset;
        assets: RawAsset[];
    };
};
type ManifestExtra = {
    expoClient?: {
        [key: string]: any;
    };
    [key: string]: any;
};
type ManifestFragment = {
    launchAsset: PartialManifestAsset;
    assets: PartialManifestAsset[];
    extra?: ManifestExtra;
};
type UpdateInfoGroup = {
    [key in UpdatePublishPlatform]: ManifestFragment;
};
export type AssetMap = Record<string, {
    httpServerLocation: string;
    name: string;
    type: string;
}>;
export declare const MetadataJoi: Joi.ObjectSchema<any>;
export declare function guessContentTypeFromExtension(ext?: string): string;
export declare function getBase64URLEncoding(buffer: Buffer): string;
/**
 * The storage key is used to store the asset in GCS
 */
export declare function getStorageKey(contentType: string, contentHash: string): string;
/**
 * Convenience function that computes an assets storage key starting from its buffer.
 */
export declare function getStorageKeyForAssetAsync(asset: RawAsset): Promise<string>;
export declare function convertAssetToUpdateInfoGroupFormatAsync(asset: RawAsset): Promise<PartialManifestAsset>;
/**
 * This will be sorted later based on the platform's runtime versions.
 */
export declare function buildUnsortedUpdateInfoGroupAsync(assets: FilteredCollectedAssets, exp: ExpoConfig): Promise<Partial<UpdateInfoGroup>>;
export type ExpoCLIExportPlatformFlag = ExpoConfigPlatform | 'all';
export declare function buildBundlesAsync({ projectDir, inputDir, exp, platformFlag, clearCache, noBytecode, sourceMaps, extraEnv, }: {
    projectDir: string;
    inputDir: string;
    exp: Pick<ExpoConfig, 'sdkVersion' | 'web'>;
    platformFlag: ExpoCLIExportPlatformFlag;
    clearCache?: boolean;
    noBytecode?: boolean;
    sourceMaps?: string;
    extraEnv?: Record<string, string | undefined> | undefined;
}): Promise<void>;
export declare function resolveInputDirectoryAsync(inputDir: string, { skipBundler }: {
    skipBundler?: boolean;
}): Promise<string>;
export declare function loadMetadata(distRoot: string): Metadata;
export declare function generateEasMetadataAsync(distRoot: string, metadata: UpdateJsonInfo[]): Promise<void>;
export type FilteredCollectedAssets = {
    [RequestedPlatform.Ios]?: NonNullable<CollectedAssets['ios']>;
    [RequestedPlatform.Android]?: NonNullable<CollectedAssets['android']>;
};
export declare function filterCollectedAssetsByRequestedPlatforms(collectedAssets: CollectedAssets, requestedPlatform: RequestedPlatform): FilteredCollectedAssets;
export declare function getAssetHashFromPath(assetPath: string): string | null;
export declare function getOriginalPathFromAssetMap(assetMap: AssetMap | null, asset: {
    path: string;
    ext: string;
}): string | null;
/** Given a directory, load the metadata.json and collect the assets for each platform. */
export declare function collectAssetsAsync(dir: string): Promise<CollectedAssets>;
export declare function filterOutAssetsThatAlreadyExistAsync(graphqlClient: ExpoGraphqlClient, uniqueAssetsWithStorageKey: (RawAsset & {
    storageKey: string;
})[]): Promise<(RawAsset & {
    storageKey: string;
})[]>;
type AssetUploadResult = {
    /** All found assets within the exported folder per platform */
    assetCount: number;
    /** The uploaded JS bundles, per platform */
    launchAssetCount: number;
    /** All unique assets within the exported folder with platforms combined */
    uniqueAssetCount: number;
    /** All unique assets uploaded  */
    uniqueUploadedAssetCount: number;
    /** All (non-launch) asset original paths, used for logging */
    uniqueUploadedAssetPaths: string[];
    /** The asset limit received from the server */
    assetLimitPerUpdateGroup: number;
};
export declare function uploadAssetsAsync(graphqlClient: ExpoGraphqlClient, assetsForUpdateInfoGroup: FilteredCollectedAssets, projectId: string, cancelationToken: {
    isCanceledOrFinished: boolean;
}, onAssetUploadResultsChanged: (assetUploadResults: {
    asset: RawAsset & {
        storageKey: string;
    };
    finished: boolean;
}[]) => void, onAssetUploadBegin: () => void): Promise<AssetUploadResult>;
export declare function isUploadedAssetCountAboveWarningThreshold(uploadedAssetCount: number, assetLimitPerUpdateGroup: number): boolean;
export declare function getBranchNameForCommandAsync({ graphqlClient, projectId, channelNameArg, branchNameArg, autoFlag, nonInteractive, paginatedQueryOptions, vcsClient, }: {
    graphqlClient: ExpoGraphqlClient;
    projectId: string;
    channelNameArg: string | undefined;
    branchNameArg: string | undefined;
    autoFlag: boolean;
    nonInteractive: boolean;
    paginatedQueryOptions: PaginatedQueryOptions;
    vcsClient: Client;
}): Promise<string>;
export declare function getUpdateMessageForCommandAsync(vcsClient: Client, { updateMessageArg, autoFlag, nonInteractive, jsonFlag, }: {
    updateMessageArg: string | undefined;
    autoFlag: boolean;
    nonInteractive: boolean;
    jsonFlag: boolean;
}): Promise<string | undefined>;
export declare const defaultPublishPlatforms: UpdatePublishPlatform[];
export type RuntimeVersionInfo = {
    runtimeVersion: string;
    expoUpdatesRuntimeFingerprint: {
        fingerprintSources: object[];
        isDebugFingerprintSource: boolean;
    } | null;
    expoUpdatesRuntimeFingerprintHash: string | null;
};
type FingerprintInfoGroup = {
    [key in UpdatePublishPlatform]?: FingerprintInfo;
};
type FingerprintInfo = {
    fingerprintHash: string;
    fingerprintSource: FingerprintSourceInput;
};
export declare function getRuntimeVersionInfoObjectsAsync({ exp, platforms, workflows, projectDir, env, }: {
    exp: ExpoConfig;
    platforms: UpdatePublishPlatform[];
    workflows: Record<ExpoConfigPlatform, Workflow>;
    projectDir: string;
    env: Env | undefined;
}): Promise<{
    platform: UpdatePublishPlatform;
    runtimeVersionInfo: RuntimeVersionInfo;
}[]>;
export declare function getRuntimeToPlatformsAndFingerprintInfoMappingFromRuntimeVersionInfoObjects(runtimeVersionInfoObjects: {
    platform: UpdatePublishPlatform;
    runtimeVersionInfo: RuntimeVersionInfo;
}[]): (RuntimeVersionInfo & {
    platforms: UpdatePublishPlatform[];
})[];
export declare function maybeCalculateFingerprintForRuntimeVersionInfoObjectsWithoutExpoUpdatesAsync({ projectDir, graphqlClient, runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMapping, workflowsByPlatform, env, }: {
    projectDir: string;
    graphqlClient: ExpoGraphqlClient;
    runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMapping: (RuntimeVersionInfo & {
        platforms: UpdatePublishPlatform[];
        expoUpdatesRuntimeFingerprintSource: FingerprintSourceInput | null;
    })[];
    workflowsByPlatform: Record<Platform, Workflow>;
    env: Env | undefined;
}): Promise<(RuntimeVersionInfo & {
    platforms: UpdatePublishPlatform[];
    expoUpdatesRuntimeFingerprintSource: FingerprintSourceInput | null;
    fingerprintInfoGroup: FingerprintInfoGroup;
})[]>;
export declare function findCompatibleBuildsAsync(graphqlClient: ExpoGraphqlClient, appId: string, runtimeToPlatformsAndFingerprintInfoMapping: {
    runtimeVersion: string;
    platforms: UpdatePublishPlatform[];
    fingerprintInfoGroup: FingerprintInfoGroup;
}): Promise<{
    runtimeVersion: string;
    platforms: UpdatePublishPlatform[];
    fingerprintInfoGroupWithCompatibleBuilds: {
        android?: (FingerprintInfo & {
            build?: BuildFragment;
        }) | undefined;
        ios?: (FingerprintInfo & {
            build?: BuildFragment;
        }) | undefined;
    };
}>;
export declare const platformDisplayNames: Record<UpdatePublishPlatform, string>;
export declare function getRuntimeToUpdateRolloutInfoGroupMappingAsync(graphqlClient: ExpoGraphqlClient, { appId, branchName, rolloutPercentage, runtimeToPlatformsAndFingerprintInfoMapping, }: {
    appId: string;
    branchName: string;
    rolloutPercentage: number;
    runtimeToPlatformsAndFingerprintInfoMapping: (RuntimeVersionInfo & {
        platforms: UpdatePublishPlatform[];
    })[];
}): Promise<Map<string, UpdateRolloutInfoGroup>>;
export declare function getUpdateRolloutInfoGroupAsync(graphqlClient: ExpoGraphqlClient, { appId, branchName, rolloutPercentage, runtimeVersion, platforms, }: {
    appId: string;
    branchName: string;
    rolloutPercentage: number;
    runtimeVersion: string;
    platforms: UpdatePublishPlatform[];
}): Promise<UpdateRolloutInfoGroup>;
/**
 * Get the command line arguments for source map generation in expo export.
 *
 * Uses --source-maps if provided, otherwise falls back to --dump-sourcemap.
 * SDK 55+ supports --source-maps with a value (e.g., 'inline'), but older SDKs
 * only support it as a boolean flag. Passing a value to older SDKs causes it
 * to be parsed as the project root positional argument.
 */
export declare function getSourceMapExportCommandArgs({ sourceMaps, sdkVersion, }: {
    sourceMaps: string | undefined;
    sdkVersion: string | undefined;
}): string[];
export {};
