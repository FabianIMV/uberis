export declare const PACKAGE_MANAGERS: readonly ["bun", "npm", "pnpm", "yarn"];
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];
export declare function promptForPackageManagerAsync(): Promise<PackageManager>;
export declare function installDependenciesAsync({ outputLevel, projectDir, packageManager, }: {
    outputLevel?: 'default' | 'none';
    projectDir: string;
    packageManager?: PackageManager;
}): Promise<void>;
