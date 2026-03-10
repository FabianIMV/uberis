import { Env, Workflow } from '@expo/eas-build-job';
import { Fingerprint, FingerprintDiffItem } from './types';
export type FingerprintOptions = {
    workflow?: Workflow;
    platforms: string[];
    debug?: boolean;
    env: Env | undefined;
    cwd?: string;
    ignorePaths?: string[];
};
export declare function diffFingerprint(projectDir: string, fingerprint1: Fingerprint, fingerprint2: Fingerprint): FingerprintDiffItem[] | null;
export declare function createFingerprintAsync(projectDir: string, options: FingerprintOptions): Promise<(Fingerprint & {
    isDebugSource: boolean;
}) | null>;
/**
 * Computes project fingerprints based on provided options and returns a map of fingerprint data keyed by a string.
 *
 * @param projectDir - The root directory of the project.
 * @param fingerprintOptionsByKey - A map where each key is associated with options for generating the fingerprint.
 *   - **Key**: A unique identifier (`string`) for the fingerprint options.
 *   - **Value**: An object containing options for generating a fingerprint.
 *
 * @returns A promise that resolves to a map where each key corresponds to the input keys, and each value is an object containing fingerprint data.
 *
 * @throws Will throw an error if fingerprint computation fails.
 */
export declare function createFingerprintsByKeyAsync(projectDir: string, fingerprintOptionsByKey: Map<string, FingerprintOptions>): Promise<Map<string, Fingerprint & {
    isDebugSource: boolean;
}>>;
