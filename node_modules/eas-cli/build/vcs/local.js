"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ignore = exports.EASIGNORE_FILENAME = void 0;
exports.makeShallowCopyAsync = makeShallowCopyAsync;
const tslib_1 = require("tslib");
const fast_glob_1 = tslib_1.__importDefault(require("fast-glob"));
const promises_1 = tslib_1.__importDefault(require("fs/promises"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const ignore_1 = tslib_1.__importDefault(require("ignore"));
const path_1 = tslib_1.__importDefault(require("path"));
const log_1 = tslib_1.__importDefault(require("../log"));
exports.EASIGNORE_FILENAME = '.easignore';
const GITIGNORE_FILENAME = '.gitignore';
/**
 * Ignore wraps the 'ignore' package to support multiple .gitignore files
 * in subdirectories.
 *
 * Inconsistencies with git behavior:
 * - if parent .gitignore has ignore rule and child has exception to that rule,
 *   file will still be ignored,
 * - node_modules is always ignored,
 * - if .easignore exists, .gitignore files are not used.
 */
class Ignore {
    rootDir;
    ignoreMapping = [];
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    static async createForCopyingAsync(rootDir) {
        const ignore = new Ignore(rootDir);
        await ignore.initIgnoreAsync({
            defaultIgnore: `
.git
node_modules
`,
        });
        return ignore;
    }
    /** Does not include the default .git and node_modules ignore rules. */
    static async createForCheckingAsync(rootDir) {
        const ignore = new Ignore(rootDir);
        await ignore.initIgnoreAsync({
            defaultIgnore: ``,
        });
        return ignore;
    }
    async initIgnoreAsync({ defaultIgnore }) {
        const easIgnorePath = path_1.default.join(this.rootDir, exports.EASIGNORE_FILENAME);
        if (await fs_extra_1.default.pathExists(easIgnorePath)) {
            this.ignoreMapping = [
                ['', (0, ignore_1.default)().add(defaultIgnore)],
                ['', (0, ignore_1.default)().add(await fs_extra_1.default.readFile(easIgnorePath, 'utf-8'))],
            ];
            log_1.default.debug('initializing ignore mapping with .easignore', {
                ignoreMapping: this.ignoreMapping,
            });
            return;
        }
        const ignoreFilePaths = (await (0, fast_glob_1.default)(`**/${GITIGNORE_FILENAME}`, {
            cwd: this.rootDir,
            ignore: ['node_modules'],
            followSymbolicLinks: false,
        }))
            // ensure that parent dir is before child directories
            .sort((a, b) => a.length - b.length && a.localeCompare(b));
        const ignoreMapping = await Promise.all(ignoreFilePaths.map(async (filePath) => {
            return [
                filePath.slice(0, filePath.length - GITIGNORE_FILENAME.length),
                (0, ignore_1.default)().add(await fs_extra_1.default.readFile(path_1.default.join(this.rootDir, filePath), 'utf-8')),
            ];
        }));
        this.ignoreMapping = [['', (0, ignore_1.default)().add(defaultIgnore)], ...ignoreMapping];
        log_1.default.debug('initializing ignore mapping with .gitignore files', {
            ignoreFilePaths,
            ignoreMapping: this.ignoreMapping,
        });
    }
    ignores(relativePath) {
        for (const [prefix, ignore] of this.ignoreMapping) {
            if (relativePath.startsWith(prefix) && ignore.ignores(relativePath.slice(prefix.length))) {
                return true;
            }
        }
        return false;
    }
}
exports.Ignore = Ignore;
async function makeShallowCopyAsync(_src, dst) {
    // `node:fs` on Windows adds a namespace prefix (e.g. `\\?\`) to the path provided
    // to the `filter` function in `fs.cp`. We need to ensure that we compare the right paths
    // (both with prefix), otherwise the `relativePath` ends up being wrong and causes no files
    // to be ignored.
    const src = path_1.default.toNamespacedPath(path_1.default.normalize(_src));
    log_1.default.debug('makeShallowCopyAsync', { src, dst });
    const ignore = await Ignore.createForCopyingAsync(src);
    log_1.default.debug('makeShallowCopyAsync ignoreMapping', { ignoreMapping: ignore.ignoreMapping });
    await promises_1.default.cp(src, dst, {
        recursive: true,
        // Preserve symlinks without re-resolving them to their original targets
        verbatimSymlinks: true,
        filter: (_srcFilePath) => {
            const srcFilePath = path_1.default.toNamespacedPath(_srcFilePath);
            if (srcFilePath === src) {
                return true;
            }
            const relativePath = path_1.default.relative(src, srcFilePath);
            const shouldCopyTheItem = !ignore.ignores(relativePath);
            log_1.default.debug(shouldCopyTheItem ? 'copying' : 'skipping', {
                src,
                srcFilePath,
                relativePath,
            });
            return shouldCopyTheItem;
        },
    });
}
