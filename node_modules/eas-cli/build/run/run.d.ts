import { AppPlatform } from '../graphql/generated';
export interface RunArchiveFlags {
    latest?: boolean;
    id?: string;
    path?: string;
    url?: string;
}
export declare function runAsync(simulatorBuildPath: string, selectedPlatform: AppPlatform): Promise<void>;
export declare function getEasBuildRunCachedAppPath(projectId: string, buildId: string, platform: AppPlatform): string;
