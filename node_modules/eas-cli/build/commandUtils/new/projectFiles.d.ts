import { AppFragment } from '../../graphql/generated';
import { PackageManager } from '../../onboarding/installDependencies';
export declare function cleanAndPrefix(_string: string, type: 'user' | 'app' | 'scheme'): string;
export declare function generateAppConfigAsync(projectDir: string, app: AppFragment): Promise<void>;
export declare function generateEasConfigAsync(projectDir: string): Promise<void>;
export declare function updatePackageJsonAsync(projectDir: string): Promise<void>;
export declare function copyProjectTemplatesAsync(projectDir: string): Promise<void>;
export declare function updateReadmeAsync(projectDir: string, packageManager: PackageManager): Promise<void>;
