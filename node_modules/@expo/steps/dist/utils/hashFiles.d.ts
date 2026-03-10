/**
 * Hashes the contents of multiple files and returns a combined SHA256 hash.
 * @param filePaths Array of absolute file paths to hash
 * @returns Combined SHA256 hash of all files, or empty string if no files exist
 */
export declare function hashFiles(filePaths: string[]): string;
