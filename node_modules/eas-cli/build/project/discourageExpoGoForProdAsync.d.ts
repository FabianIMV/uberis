import type { ProfileData } from '../utils/profiles';
import type { Client } from '../vcs/vcs';
export declare function discourageExpoGoForProdAsync(buildProfiles: ProfileData<'build'>[] | undefined, projectDir: string, vcsClient: Client): Promise<void>;
export declare function detectExpoGoProdBuildAsync(buildProfiles: ProfileData<'build'>[] | undefined, projectDir: string, vcsClient: Client): Promise<boolean>;
