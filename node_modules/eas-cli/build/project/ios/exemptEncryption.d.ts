import { ExpoConfig } from '@expo/config';
/** Non-exempt encryption must be set on every build in App Store Connect, we move it to before the build process to attempt only setting it once for the entire life-cycle of the project. */
export declare function ensureNonExemptEncryptionIsDefinedForManagedProjectAsync({ projectDir, exp, nonInteractive, }: {
    projectDir: string;
    exp: ExpoConfig;
    nonInteractive: boolean;
}): Promise<void>;
