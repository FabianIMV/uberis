"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printDirectory = printDirectory;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
/**
 * Formats a directory path for display.
 * If the directory is within the current working directory, returns a relative path.
 * Otherwise, returns the absolute path.
 */
function printDirectory(directory) {
    const cwd = process.cwd();
    const absoluteDir = path_1.default.isAbsolute(directory) ? directory : path_1.default.resolve(cwd, directory);
    const relativePath = path_1.default.relative(cwd, absoluteDir);
    // If the relative path doesn't start with '..' it means it's within or at the cwd
    if (!relativePath.startsWith('..') && !path_1.default.isAbsolute(relativePath)) {
        return relativePath !== '' ? `./${relativePath}` : '.';
    }
    return absoluteDir;
}
