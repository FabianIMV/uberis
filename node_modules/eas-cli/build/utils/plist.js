"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPlistAsync = readPlistAsync;
exports.writePlistAsync = writePlistAsync;
exports.parseBinaryPlistBuffer = parseBinaryPlistBuffer;
const tslib_1 = require("tslib");
const plist_1 = tslib_1.__importDefault(require("@expo/plist"));
const bplist_parser_1 = tslib_1.__importDefault(require("bplist-parser"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
async function readPlistAsync(plistPath) {
    if (await fs_extra_1.default.pathExists(plistPath)) {
        const expoPlistContent = await fs_extra_1.default.readFile(plistPath, 'utf8');
        try {
            return plist_1.default.parse(expoPlistContent);
        }
        catch (err) {
            err.message = `Failed to parse ${plistPath}. ${err.message}`;
            throw err;
        }
    }
    else {
        return null;
    }
}
async function writePlistAsync(plistPath, plistObject) {
    const contents = plist_1.default.build(plistObject);
    await fs_extra_1.default.mkdirp(path_1.default.dirname(plistPath));
    await fs_extra_1.default.writeFile(plistPath, contents);
}
const CHAR_CHEVRON_OPEN = 60;
const CHAR_B_LOWER = 98;
function parseBinaryPlistBuffer(contents) {
    if (contents[0] === CHAR_CHEVRON_OPEN) {
        const info = plist_1.default.parse(contents.toString());
        if (Array.isArray(info)) {
            return info[0];
        }
        return info;
    }
    else if (contents[0] === CHAR_B_LOWER) {
        const info = bplist_parser_1.default.parseBuffer(contents);
        if (Array.isArray(info)) {
            return info[0];
        }
        return info;
    }
    else {
        throw new Error(`Cannot parse plist of type byte (0x${contents[0].toString(16)})`);
    }
}
