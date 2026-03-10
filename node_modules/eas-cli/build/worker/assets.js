"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectAssetsAsync = collectAssetsAsync;
exports.getRoutesConfigAsync = getRoutesConfigAsync;
exports.assetsToAssetsMap = assetsToAssetsMap;
exports.createManifestAsync = createManifestAsync;
exports.listWorkerFilesAsync = listWorkerFilesAsync;
exports.packFilesIterableAsync = packFilesIterableAsync;
const tslib_1 = require("tslib");
const env_1 = require("@expo/env");
const mime_1 = tslib_1.__importDefault(require("mime"));
const minizlib_1 = require("minizlib");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = tslib_1.__importStar(require("node:fs"));
const node_os_1 = tslib_1.__importDefault(require("node:os"));
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const promises_1 = require("node:stream/promises");
const tar_stream_1 = require("tar-stream");
const EnvironmentVariablesQuery_1 = require("../graphql/queries/EnvironmentVariablesQuery");
const EXPO_ROUTES_PATHS = new Set(['_expo/routes.json', '_expo/.routes.json', '.expo-routes.json']);
/** Returns whether a file or folder is ignored */
function isIgnoredName(name) {
    switch (name) {
        // macOS system files
        case '.DS_Store':
        case '.AppleDouble':
        case '.Trashes':
        case '__MACOSX':
        case '.LSOverride':
            return true;
        default:
            // Backup file name convention
            return name.endsWith('~');
    }
}
/** Creates a temporary file write path */
async function createTempWritePathAsync() {
    const basename = node_path_1.default.basename(__filename, node_path_1.default.extname(__filename));
    const tmpdir = await node_fs_1.default.promises.realpath(node_os_1.default.tmpdir());
    const random = (0, node_crypto_1.randomBytes)(4).toString('hex');
    return node_path_1.default.resolve(tmpdir, `tmp-${basename}-${process.pid}-${random}`);
}
/** Computes a SHA512 hash for a file */
async function computeSha512HashAsync(filePath) {
    const hash = (0, node_crypto_1.createHash)('sha512', { encoding: 'hex' });
    await (0, promises_1.pipeline)(node_fs_1.default.createReadStream(filePath), hash);
    return `${hash.read()}`;
}
/** Lists plain files in base path recursively and outputs normalized paths */
function listFilesRecursively(basePath) {
    async function* recurseAsync(parentPath) {
        const target = parentPath ? node_path_1.default.resolve(basePath, parentPath) : basePath;
        const entries = await node_fs_1.default.promises.readdir(target, { withFileTypes: true });
        for (const dirent of entries) {
            const normalizedPath = parentPath ? `${parentPath}/${dirent.name}` : dirent.name;
            if (isIgnoredName(dirent.name)) {
                continue;
            }
            else if (dirent.isFile()) {
                const absolutePath = node_path_1.default.resolve(target, dirent.name);
                const stats = await node_fs_1.default.promises.stat(absolutePath);
                yield {
                    normalizedPath,
                    path: absolutePath,
                    size: stats.size,
                };
            }
            else if (dirent.isDirectory()) {
                yield* recurseAsync(normalizedPath);
            }
        }
    }
    return recurseAsync();
}
async function determineMimeTypeAsync(filePath) {
    let contentType = mime_1.default.getType(node_path_1.default.basename(filePath));
    if (!contentType) {
        const fileContent = await node_fs_1.default.promises.readFile(filePath, 'utf-8');
        try {
            // check if file is valid JSON without an extension, e.g. for the apple app site association file
            const parsedData = JSON.parse(fileContent);
            if (parsedData) {
                contentType = 'application/json';
            }
        }
        catch { }
    }
    return contentType;
}
/** Collects assets from a given target path */
async function collectAssetsAsync(assetPath, options) {
    const assets = [];
    if (assetPath) {
        for await (const file of listFilesRecursively(assetPath)) {
            if (file.size > options.maxFileSize) {
                throw new Error(`Upload of "${file.normalizedPath}" aborted: File size is greater than the upload limit (>500MB)`);
            }
            else if (EXPO_ROUTES_PATHS.has(file.normalizedPath)) {
                continue;
            }
            const sha512$ = computeSha512HashAsync(file.path);
            const contentType$ = determineMimeTypeAsync(file.path);
            assets.push({
                normalizedPath: file.normalizedPath,
                path: file.path,
                size: file.size,
                sha512: await sha512$,
                type: await contentType$,
            });
        }
    }
    return assets;
}
async function getRoutesConfigAsync(assetPath) {
    if (assetPath) {
        for (const candidatePath of EXPO_ROUTES_PATHS) {
            const targetPath = node_path_1.default.resolve(assetPath, candidatePath);
            let json;
            try {
                json = JSON.parse(await node_fs_1.default.promises.readFile(targetPath, 'utf8'));
            }
            catch {
                continue;
            }
            if (typeof json === 'object' && json) {
                return json;
            }
        }
    }
    return null;
}
/** Converts array of asset entries into AssetMap (as sent to deployment-api) */
function assetsToAssetsMap(assets) {
    return assets.reduce((map, entry) => {
        map[entry.normalizedPath] = {
            sha512: entry.sha512,
            size: entry.size,
        };
        return map;
    }, Object.create(null));
}
/** Creates a manifest configuration sent up for deployment */
async function createManifestAsync(params, graphqlClient) {
    // Resolve .env file variables
    const { env } = (0, env_1.parseProjectEnv)(params.projectDir, { mode: 'production' });
    // Maybe load EAS Environment Variables (based on `--environment` arg)
    let conflictingVariableNames;
    if (params.environment) {
        const loadedVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdWithSensitiveAsync(graphqlClient, {
            appId: params.projectId,
            environment: params.environment,
        });
        // Load EAS Env vars into `env` object, keeping track of conflicts
        conflictingVariableNames = [];
        for (const variable of loadedVariables) {
            if (variable.value != null) {
                if (env[variable.name] != null) {
                    conflictingVariableNames.push(variable.name);
                }
                env[variable.name] = variable.value;
            }
        }
    }
    const manifest = { env };
    return { conflictingVariableNames, manifest };
}
/** Reads worker files while normalizing sourcemaps and providing normalized paths */
async function* listWorkerFilesAsync(workerPath, options) {
    for await (const file of listFilesRecursively(workerPath)) {
        if (options?.skipSourceMaps && file.normalizedPath.endsWith('.map')) {
            continue;
        }
        yield {
            normalizedPath: file.normalizedPath,
            path: file.path,
            data: await node_fs_1.default.promises.readFile(file.path),
        };
    }
}
/** Packs file entries into a tar.gz file (path to tgz returned) */
async function packFilesIterableAsync(iterable, options) {
    const writePath = `${await createTempWritePathAsync()}.tar.gz`;
    const write = (0, node_fs_1.createWriteStream)(writePath);
    const gzip = new minizlib_1.Gzip({ portable: true, ...options });
    const tar = (0, tar_stream_1.pack)();
    const writeTask$ = (0, promises_1.pipeline)(tar, gzip, write);
    for await (const file of iterable) {
        tar.entry({ name: file[0], type: 'file' }, file[1]);
    }
    tar.finalize();
    await writeTask$;
    return writePath;
}
