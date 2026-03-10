import { GzipOptions } from 'minizlib';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
interface AssetMapOptions {
    maxFileSize: number;
}
export interface AssetFileEntry {
    normalizedPath: string;
    path: string;
    size: number;
    sha512: string;
    type: string | null;
}
/** Collects assets from a given target path */
export declare function collectAssetsAsync(assetPath: string | undefined, options: AssetMapOptions): Promise<AssetFileEntry[]>;
export interface RoutesConfigEntry {
    headers?: Record<string, unknown>;
    redirects?: Record<string, unknown>[];
}
export declare function getRoutesConfigAsync(assetPath: string | undefined): Promise<RoutesConfigEntry | null>;
/** Mapping of normalized file paths to a SHA512 hash */
export type AssetMap = Record<string, string | {
    sha512: string;
    size: number;
}>;
/** Converts array of asset entries into AssetMap (as sent to deployment-api) */
export declare function assetsToAssetsMap(assets: AssetFileEntry[]): AssetMap;
export interface Manifest {
    env: Record<string, string | undefined>;
}
export interface CreateManifestResult {
    conflictingVariableNames: string[] | undefined;
    manifest: Manifest;
}
interface CreateManifestParams {
    projectId: string;
    projectDir: string;
    environment?: string;
}
/** Creates a manifest configuration sent up for deployment */
export declare function createManifestAsync(params: CreateManifestParams, graphqlClient: ExpoGraphqlClient): Promise<CreateManifestResult>;
interface WorkerFileEntry {
    normalizedPath: string;
    path: string;
    data: Buffer | string;
}
/** Reads worker files while normalizing sourcemaps and providing normalized paths */
export declare function listWorkerFilesAsync(workerPath: string, options?: {
    skipSourceMaps?: boolean;
}): AsyncGenerator<WorkerFileEntry>;
/** Entry of a normalized (gzip-safe) path and file data */
export type FileEntry = readonly [normalizedPath: string, data: Buffer | string];
/** Packs file entries into a tar.gz file (path to tgz returned) */
export declare function packFilesIterableAsync(iterable: Iterable<FileEntry> | AsyncIterable<FileEntry>, options?: GzipOptions): Promise<string>;
export {};
