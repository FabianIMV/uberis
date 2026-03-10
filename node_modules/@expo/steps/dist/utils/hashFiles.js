"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashFiles = hashFiles;
const crypto_1 = require("crypto");
const fs_extra_1 = __importDefault(require("fs-extra"));
/**
 * Hashes the contents of multiple files and returns a combined SHA256 hash.
 * @param filePaths Array of absolute file paths to hash
 * @returns Combined SHA256 hash of all files, or empty string if no files exist
 */
function hashFiles(filePaths) {
    const combinedHash = (0, crypto_1.createHash)('sha256');
    let hasFound = false;
    for (const filePath of filePaths) {
        try {
            if (fs_extra_1.default.pathExistsSync(filePath)) {
                const fileContent = fs_extra_1.default.readFileSync(filePath);
                const fileHash = (0, crypto_1.createHash)('sha256').update(new Uint8Array(fileContent)).digest();
                combinedHash.write(fileHash);
                hasFound = true;
            }
        }
        catch (err) {
            throw new Error(`Failed to hash file ${filePath}: ${err.message}`);
        }
    }
    combinedHash.end();
    const result = combinedHash.digest('hex');
    if (!hasFound) {
        return '';
    }
    return result;
}
