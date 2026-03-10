import { PackageManager } from '../../onboarding/installDependencies';
export declare function cloneTemplateAsync(targetProjectDir: string): Promise<string>;
export declare function installProjectDependenciesAsync(projectDir: string, packageManager: PackageManager): Promise<void>;
export declare function initializeGitRepositoryAsync(projectDir: string): Promise<void>;
