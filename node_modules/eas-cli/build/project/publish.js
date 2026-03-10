"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformDisplayNames = exports.defaultPublishPlatforms = exports.MetadataJoi = void 0;
exports.guessContentTypeFromExtension = guessContentTypeFromExtension;
exports.getBase64URLEncoding = getBase64URLEncoding;
exports.getStorageKey = getStorageKey;
exports.getStorageKeyForAssetAsync = getStorageKeyForAssetAsync;
exports.convertAssetToUpdateInfoGroupFormatAsync = convertAssetToUpdateInfoGroupFormatAsync;
exports.buildUnsortedUpdateInfoGroupAsync = buildUnsortedUpdateInfoGroupAsync;
exports.buildBundlesAsync = buildBundlesAsync;
exports.resolveInputDirectoryAsync = resolveInputDirectoryAsync;
exports.loadMetadata = loadMetadata;
exports.generateEasMetadataAsync = generateEasMetadataAsync;
exports.filterCollectedAssetsByRequestedPlatforms = filterCollectedAssetsByRequestedPlatforms;
exports.getAssetHashFromPath = getAssetHashFromPath;
exports.getOriginalPathFromAssetMap = getOriginalPathFromAssetMap;
exports.collectAssetsAsync = collectAssetsAsync;
exports.filterOutAssetsThatAlreadyExistAsync = filterOutAssetsThatAlreadyExistAsync;
exports.uploadAssetsAsync = uploadAssetsAsync;
exports.isUploadedAssetCountAboveWarningThreshold = isUploadedAssetCountAboveWarningThreshold;
exports.getBranchNameForCommandAsync = getBranchNameForCommandAsync;
exports.getUpdateMessageForCommandAsync = getUpdateMessageForCommandAsync;
exports.getRuntimeVersionInfoObjectsAsync = getRuntimeVersionInfoObjectsAsync;
exports.getRuntimeToPlatformsAndFingerprintInfoMappingFromRuntimeVersionInfoObjects = getRuntimeToPlatformsAndFingerprintInfoMappingFromRuntimeVersionInfoObjects;
exports.maybeCalculateFingerprintForRuntimeVersionInfoObjectsWithoutExpoUpdatesAsync = maybeCalculateFingerprintForRuntimeVersionInfoObjectsWithoutExpoUpdatesAsync;
exports.findCompatibleBuildsAsync = findCompatibleBuildsAsync;
exports.getRuntimeToUpdateRolloutInfoGroupMappingAsync = getRuntimeToUpdateRolloutInfoGroupMappingAsync;
exports.getUpdateRolloutInfoGroupAsync = getUpdateRolloutInfoGroupAsync;
exports.getSourceMapExportCommandArgs = getSourceMapExportCommandArgs;
const tslib_1 = require("tslib");
const config_plugins_1 = require("@expo/config-plugins");
const eas_build_job_1 = require("@expo/eas-build-job");
const json_file_1 = tslib_1.__importDefault(require("@expo/json-file"));
const assert_1 = tslib_1.__importDefault(require("assert"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const joi_1 = tslib_1.__importDefault(require("joi"));
const mime_1 = tslib_1.__importDefault(require("mime"));
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const path_1 = tslib_1.__importDefault(require("path"));
const promise_limit_1 = tslib_1.__importDefault(require("promise-limit"));
const semver_1 = tslib_1.__importDefault(require("semver"));
const maybeUploadFingerprintAsync_1 = require("./maybeUploadFingerprintAsync");
const projectUtils_1 = require("./projectUtils");
const resolveRuntimeVersionAsync_1 = require("./resolveRuntimeVersionAsync");
const queries_1 = require("../branch/queries");
const utils_1 = require("../branch/utils");
const builds_1 = require("../commandUtils/builds");
const cli_1 = require("../fingerprint/cli");
const generated_1 = require("../graphql/generated");
const PublishMutation_1 = require("../graphql/mutations/PublishMutation");
const BranchQuery_1 = require("../graphql/queries/BranchQuery");
const PublishQuery_1 = require("../graphql/queries/PublishQuery");
const log_1 = tslib_1.__importStar(require("../log"));
const platform_1 = require("../platform");
const prompts_1 = require("../prompts");
const getBranchFromChannelNameAndCreateAndLinkIfNotExistsAsync_1 = require("../update/getBranchFromChannelNameAndCreateAndLinkIfNotExistsAsync");
const utils_2 = require("../update/utils");
const uploads_1 = require("../uploads");
const expoCli_1 = require("../utils/expoCli");
const expoUpdatesCli_1 = require("../utils/expoUpdatesCli");
const chunk_1 = tslib_1.__importDefault(require("../utils/expodash/chunk"));
const filter_1 = require("../utils/expodash/filter");
const groupBy_1 = tslib_1.__importDefault(require("../utils/expodash/groupBy"));
const mapMapAsync_1 = tslib_1.__importDefault(require("../utils/expodash/mapMapAsync"));
const uniqBy_1 = tslib_1.__importDefault(require("../utils/expodash/uniqBy"));
const fileMetadataJoi = joi_1.default.object({
    assets: joi_1.default.array()
        .required()
        .items(joi_1.default.object({ path: joi_1.default.string().required(), ext: joi_1.default.string().required() })),
    bundle: joi_1.default.string().required(),
}).optional();
exports.MetadataJoi = joi_1.default.object({
    version: joi_1.default.number().required(),
    bundler: joi_1.default.string().required(),
    fileMetadata: joi_1.default.object({
        android: fileMetadataJoi,
        ios: fileMetadataJoi,
        web: fileMetadataJoi,
    }).required(),
}).required();
function guessContentTypeFromExtension(ext) {
    return mime_1.default.getType(ext ?? '') ?? 'application/octet-stream'; // unrecognized extension
}
function getBase64URLEncoding(buffer) {
    const base64 = buffer.toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/**
 * The storage key is used to store the asset in GCS
 */
function getStorageKey(contentType, contentHash) {
    const nullSeparator = Buffer.alloc(1);
    const hash = crypto_1.default
        .createHash('sha256')
        .update(contentType)
        .update(nullSeparator)
        .update(contentHash)
        .digest();
    return getBase64URLEncoding(hash);
}
async function calculateFileHashAsync(filePath, algorithm) {
    return await new Promise((resolve, reject) => {
        const file = fs_extra_1.default.createReadStream(filePath).on('error', reject);
        const hash = file.pipe(crypto_1.default.createHash(algorithm)).on('error', reject);
        hash.on('finish', () => {
            resolve(hash.read());
        });
    });
}
/**
 * Convenience function that computes an assets storage key starting from its buffer.
 */
async function getStorageKeyForAssetAsync(asset) {
    const fileSHA256 = getBase64URLEncoding(await calculateFileHashAsync(asset.path, 'sha256'));
    return getStorageKey(asset.contentType, fileSHA256);
}
async function convertAssetToUpdateInfoGroupFormatAsync(asset) {
    const fileSHA256 = getBase64URLEncoding(await calculateFileHashAsync(asset.path, 'sha256'));
    const { contentType, fileExtension } = asset;
    const storageKey = getStorageKey(contentType, fileSHA256);
    const bundleKey = (await calculateFileHashAsync(asset.path, 'md5')).toString('hex');
    return {
        fileSHA256,
        contentType,
        storageKey,
        bundleKey,
        fileExtension,
    };
}
/**
 * This will be sorted later based on the platform's runtime versions.
 */
async function buildUnsortedUpdateInfoGroupAsync(assets, exp) {
    let platform;
    const updateInfoGroup = {};
    for (platform in assets) {
        updateInfoGroup[platform] = {
            launchAsset: await convertAssetToUpdateInfoGroupFormatAsync(assets[platform]?.launchAsset),
            assets: await Promise.all((assets[platform]?.assets ?? []).map(convertAssetToUpdateInfoGroupFormatAsync)),
            extra: {
                expoClient: exp,
            },
        };
    }
    return updateInfoGroup;
}
async function buildBundlesAsync({ projectDir, inputDir, exp, platformFlag, clearCache, noBytecode, sourceMaps, extraEnv, }) {
    const packageJSON = json_file_1.default.read(path_1.default.resolve(projectDir, 'package.json'));
    if (!packageJSON) {
        throw new Error('Could not locate package.json');
    }
    // Legacy global Expo CLI
    if (!(0, expoCli_1.shouldUseVersionedExpoCLI)(projectDir, exp)) {
        await (0, expoCli_1.expoCommandAsync)(projectDir, [
            'export',
            '--output-dir',
            inputDir,
            '--experimental-bundle',
            '--non-interactive',
            '--dump-sourcemap',
            '--dump-assetmap',
            `--platform=${platformFlag}`,
            ...(clearCache ? ['--clear'] : []),
        ], {
            extraEnv,
        });
        return;
    }
    // Versioned Expo CLI, with multiple platform flag support
    if ((0, expoCli_1.shouldUseVersionedExpoCLIWithExplicitPlatforms)(projectDir)) {
        // When creating EAS updates, we don't want to build a web bundle
        const platformArgs = platformFlag === 'all'
            ? ['--platform', 'ios', '--platform', 'android']
            : ['--platform', platformFlag];
        const sourceMapArgs = getSourceMapExportCommandArgs({ sourceMaps, sdkVersion: exp.sdkVersion });
        await (0, expoCli_1.expoCommandAsync)(projectDir, [
            'export',
            '--output-dir',
            inputDir,
            ...sourceMapArgs,
            '--dump-assetmap',
            ...platformArgs,
            ...(clearCache ? ['--clear'] : []),
            ...(noBytecode ? ['--no-bytecode'] : []),
        ], {
            extraEnv,
        });
        return;
    }
    // Versioned Expo CLI, without multiple platform flag support
    // Warn users about potential export issues when using Metro web
    // See: https://github.com/expo/expo/pull/23621
    if (exp.web?.bundler === 'metro') {
        log_1.default.warn('Exporting bundle for all platforms, including Metro web.');
        log_1.default.warn('If your app is incompatible with web, remove the "expo.web.bundler" property from your app manifest, or upgrade to the latest Expo SDK.');
    }
    const sourceMapArgs = getSourceMapExportCommandArgs({ sourceMaps, sdkVersion: exp.sdkVersion });
    await (0, expoCli_1.expoCommandAsync)(projectDir, [
        'export',
        '--output-dir',
        inputDir,
        ...sourceMapArgs,
        '--dump-assetmap',
        `--platform=${platformFlag}`,
        ...(clearCache ? ['--clear'] : []),
        ...(noBytecode ? ['--no-bytecode'] : []),
    ], {
        extraEnv,
    });
}
async function resolveInputDirectoryAsync(inputDir, { skipBundler }) {
    const distRoot = path_1.default.resolve(inputDir);
    if (!(await fs_extra_1.default.pathExists(distRoot))) {
        let error = `--input-dir="${inputDir}" not found.`;
        if (skipBundler) {
            error += ` --skip-bundler requires the project to be exported manually before uploading. Ex: npx expo export && eas update --skip-bundler`;
        }
        throw new Error(error);
    }
    return distRoot;
}
function loadMetadata(distRoot) {
    const metadata = json_file_1.default.read(path_1.default.join(distRoot, 'metadata.json'));
    const { error } = exports.MetadataJoi.validate(metadata);
    if (error) {
        throw error;
    }
    // Check version and bundler by hand (instead of with Joi) so
    // more informative error messages can be returned.
    if (metadata.version !== 0) {
        throw new Error('Only bundles with metadata version 0 are supported');
    }
    if (metadata.bundler !== 'metro') {
        throw new Error('Only bundles created with Metro are currently supported');
    }
    const platforms = Object.keys(metadata.fileMetadata);
    if (platforms.length === 0) {
        log_1.default.warn('No updates were exported for any platform');
    }
    log_1.default.debug(`Loaded ${platforms.length} platform(s): ${platforms.join(', ')}`);
    return metadata;
}
async function generateEasMetadataAsync(distRoot, metadata) {
    const easMetadataPath = path_1.default.join(distRoot, 'eas-update-metadata.json');
    await json_file_1.default.writeAsync(easMetadataPath, { updates: metadata });
}
function filterCollectedAssetsByRequestedPlatforms(collectedAssets, requestedPlatform) {
    if (requestedPlatform === platform_1.RequestedPlatform.All) {
        return {
            ...('ios' in collectedAssets ? { [platform_1.RequestedPlatform.Ios]: collectedAssets['ios'] } : {}),
            ...('android' in collectedAssets
                ? { [platform_1.RequestedPlatform.Android]: collectedAssets['android'] }
                : {}),
        };
    }
    const collectedAssetsKey = requestedPlatform === platform_1.RequestedPlatform.Android ? 'android' : 'ios';
    if (!collectedAssets[collectedAssetsKey]) {
        throw new Error(`--platform="${collectedAssetsKey}" not found in metadata.json. Available platform(s): ${Object.keys(collectedAssets).join(', ')}`);
    }
    return { [requestedPlatform]: collectedAssets[collectedAssetsKey] };
}
/** Try to load the asset map for logging the names of assets published */
async function loadAssetMapAsync(distRoot) {
    const assetMapPath = path_1.default.join(distRoot, 'assetmap.json');
    if (!(await fs_extra_1.default.pathExists(assetMapPath))) {
        return null;
    }
    const assetMap = json_file_1.default.read(path_1.default.join(distRoot, 'assetmap.json'));
    // TODO: basic validation?
    return assetMap;
}
// exposed for testing
function getAssetHashFromPath(assetPath) {
    const [, hash] = assetPath.match(new RegExp(/assets\/([a-z0-9]+)$/, 'i')) ?? [];
    return hash ?? null;
}
// exposed for testing
function getOriginalPathFromAssetMap(assetMap, asset) {
    if (!assetMap) {
        return null;
    }
    const assetHash = getAssetHashFromPath(asset.path);
    const assetMapEntry = assetHash && assetMap[assetHash];
    if (!assetMapEntry) {
        return null;
    }
    const pathPrefix = assetMapEntry.httpServerLocation.substring('/assets'.length);
    return `${pathPrefix}/${assetMapEntry.name}.${assetMapEntry.type}`;
}
/** Given a directory, load the metadata.json and collect the assets for each platform. */
async function collectAssetsAsync(dir) {
    const metadata = loadMetadata(dir);
    const assetmap = await loadAssetMapAsync(dir);
    const collectedAssets = {};
    for (const platform of Object.keys(metadata.fileMetadata)) {
        collectedAssets[platform] = {
            launchAsset: {
                // path.extname() returns an empty string when there's no extension so we use || to fall back to .bundle
                fileExtension: path_1.default.extname(metadata.fileMetadata[platform].bundle) || '.bundle',
                contentType: 'application/javascript',
                path: path_1.default.resolve(dir, metadata.fileMetadata[platform].bundle),
            },
            assets: metadata.fileMetadata[platform].assets.map(asset => ({
                fileExtension: asset.ext ? ensureLeadingPeriod(asset.ext) : undefined,
                originalPath: getOriginalPathFromAssetMap(assetmap, asset) ?? undefined,
                contentType: guessContentTypeFromExtension(asset.ext),
                path: path_1.default.join(dir, asset.path),
            })),
        };
    }
    return collectedAssets;
}
// ensure the file extension has a '.' prefix
function ensureLeadingPeriod(extension) {
    return extension.startsWith('.') ? extension : `.${extension}`;
}
async function filterOutAssetsThatAlreadyExistAsync(graphqlClient, uniqueAssetsWithStorageKey) {
    const assetMetadata = await PublishQuery_1.PublishQuery.getAssetMetadataAsync(graphqlClient, uniqueAssetsWithStorageKey.map(asset => asset.storageKey));
    const missingAssetKeys = assetMetadata
        .filter(result => result.status !== generated_1.AssetMetadataStatus.Exists)
        .map(result => result.storageKey);
    const missingAssets = uniqueAssetsWithStorageKey.filter(asset => {
        return missingAssetKeys.includes(asset.storageKey);
    });
    return missingAssets;
}
async function uploadAssetsAsync(graphqlClient, assetsForUpdateInfoGroup, projectId, cancelationToken, onAssetUploadResultsChanged, onAssetUploadBegin) {
    let assets = [];
    let platform;
    const launchAssets = [];
    for (platform in assetsForUpdateInfoGroup) {
        launchAssets.push(assetsForUpdateInfoGroup[platform].launchAsset);
        assets = [
            ...assets,
            assetsForUpdateInfoGroup[platform].launchAsset,
            ...assetsForUpdateInfoGroup[platform].assets,
        ];
    }
    const assetsWithStorageKey = await Promise.all(assets.map(async (asset) => {
        return {
            ...asset,
            storageKey: await getStorageKeyForAssetAsync(asset),
        };
    }));
    const uniqueAssets = (0, uniqBy_1.default)(assetsWithStorageKey, asset => asset.storageKey);
    onAssetUploadResultsChanged?.(uniqueAssets.map(asset => ({ asset, finished: false })));
    let missingAssets = await filterOutAssetsThatAlreadyExistAsync(graphqlClient, uniqueAssets);
    let missingAssetStorageKeys = new Set(missingAssets.map(a => a.storageKey));
    const uniqueUploadedAssetCount = missingAssets.length;
    const uniqueUploadedAssetPaths = missingAssets.map(asset => asset.originalPath).filter(filter_1.truthy);
    if (cancelationToken.isCanceledOrFinished) {
        throw Error('Canceled upload');
    }
    const missingAssetChunks = (0, chunk_1.default)(missingAssets, 100);
    const specifications = [];
    for (const missingAssets of missingAssetChunks) {
        const { specifications: chunkSpecifications } = await PublishMutation_1.PublishMutation.getUploadURLsAsync(graphqlClient, missingAssets.map(ma => ma.contentType));
        specifications.push(...chunkSpecifications);
    }
    onAssetUploadResultsChanged?.(uniqueAssets.map(asset => ({ asset, finished: !missingAssetStorageKeys.has(asset.storageKey) })));
    const assetUploadPromiseLimit = (0, promise_limit_1.default)(15);
    const [assetLimitPerUpdateGroup] = await Promise.all([
        PublishQuery_1.PublishQuery.getAssetLimitPerUpdateGroupAsync(graphqlClient, projectId),
        Promise.all(missingAssets.map((missingAsset, i) => {
            return assetUploadPromiseLimit(async () => {
                if (cancelationToken.isCanceledOrFinished) {
                    throw Error('Canceled upload');
                }
                const presignedPost = JSON.parse(specifications[i]);
                await (0, uploads_1.uploadWithPresignedPostWithRetryAsync)(missingAsset.path, presignedPost, onAssetUploadBegin);
            });
        })),
    ]);
    let timeout = 1;
    while (missingAssets.length > 0) {
        if (cancelationToken.isCanceledOrFinished) {
            throw Error('Canceled upload');
        }
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, Math.min(timeout * 1000, 5000))); // linear backoff
        missingAssets = await filterOutAssetsThatAlreadyExistAsync(graphqlClient, missingAssets);
        missingAssetStorageKeys = new Set(missingAssets.map(a => a.storageKey));
        await timeoutPromise; // await after filterOutAssetsThatAlreadyExistAsync for easy mocking with jest.runAllTimers
        timeout += 1;
        onAssetUploadResultsChanged?.(uniqueAssets.map(asset => ({
            asset,
            finished: !missingAssetStorageKeys.has(asset.storageKey),
        })));
    }
    cancelationToken.isCanceledOrFinished = true;
    return {
        assetCount: assets.length,
        launchAssetCount: launchAssets.length,
        uniqueAssetCount: uniqueAssets.length,
        uniqueUploadedAssetCount,
        uniqueUploadedAssetPaths,
        assetLimitPerUpdateGroup,
    };
}
function isUploadedAssetCountAboveWarningThreshold(uploadedAssetCount, assetLimitPerUpdateGroup) {
    const warningThreshold = Math.floor(assetLimitPerUpdateGroup * 0.75);
    return uploadedAssetCount > warningThreshold;
}
async function getBranchNameForCommandAsync({ graphqlClient, projectId, channelNameArg, branchNameArg, autoFlag, nonInteractive, paginatedQueryOptions, vcsClient, }) {
    if (channelNameArg && branchNameArg) {
        throw new Error('Cannot specify both --channel and --branch. Specify either --channel, --branch, or --auto.');
    }
    if (channelNameArg) {
        const { branchName } = await (0, getBranchFromChannelNameAndCreateAndLinkIfNotExistsAsync_1.getBranchFromChannelNameAndCreateAndLinkIfNotExistsAsync)(graphqlClient, projectId, channelNameArg);
        return branchName;
    }
    if (branchNameArg) {
        return branchNameArg;
    }
    if (autoFlag) {
        const defaultBranchNameFromVcs = await (0, utils_1.getDefaultBranchNameAsync)(vcsClient);
        if (!defaultBranchNameFromVcs) {
            throw new Error('Must supply --branch or --channel for branch name as auto-detection of branch name via --auto is not supported when no VCS is present.');
        }
        return defaultBranchNameFromVcs;
    }
    else if (nonInteractive) {
        throw new Error('Must supply --channel, --branch or --auto when in non-interactive mode.');
    }
    else {
        let branchName;
        try {
            const branch = await (0, queries_1.selectBranchOnAppAsync)(graphqlClient, {
                projectId,
                promptTitle: `Which branch would you like to use?`,
                displayTextForListItem: updateBranch => ({
                    title: `${updateBranch.name} ${chalk_1.default.grey(`- current update: ${(0, utils_2.formatUpdateMessage)(updateBranch.updates[0])}`)}`,
                }),
                paginatedQueryOptions,
            });
            branchName = branch.name;
        }
        catch {
            // unable to select a branch (network error or no branches for project)
            const { name } = await (0, prompts_1.promptAsync)({
                type: 'text',
                name: 'name',
                message: 'No branches found. Provide a branch name:',
                initial: (await (0, utils_1.getDefaultBranchNameAsync)(vcsClient)) ?? undefined,
                validate: value => (value ? true : 'Branch name may not be empty.'),
            });
            branchName = name;
        }
        (0, assert_1.default)(branchName, 'Branch name must be specified.');
        return branchName;
    }
}
async function getUpdateMessageForCommandAsync(vcsClient, { updateMessageArg, autoFlag, nonInteractive, jsonFlag, }) {
    let updateMessage = updateMessageArg;
    if (!updateMessageArg && autoFlag) {
        updateMessage = (await vcsClient.getLastCommitMessageAsync())?.trim();
    }
    if (!updateMessage) {
        if (nonInteractive || jsonFlag) {
            if (vcsClient.canGetLastCommitMessage()) {
                throw new Error('Must supply --message or use --auto when in non-interactive mode and VCS is available');
            }
            return undefined;
        }
        const { updateMessageLocal } = await (0, prompts_1.promptAsync)({
            type: 'text',
            name: 'updateMessageLocal',
            message: `Provide an update message:`,
            initial: (await vcsClient.getLastCommitMessageAsync())?.trim(),
        });
        if (!updateMessageLocal) {
            return undefined;
        }
        updateMessage = updateMessageLocal;
    }
    if (!updateMessage) {
        return undefined;
    }
    const truncatedMessage = (0, utils_2.truncateString)(updateMessage, 1024);
    if (truncatedMessage !== updateMessage) {
        log_1.default.warn('Update message exceeds the allowed 1024 character limit. Truncating message...');
    }
    return truncatedMessage;
}
exports.defaultPublishPlatforms = ['android', 'ios'];
async function getRuntimeVersionInfoObjectsAsync({ exp, platforms, workflows, projectDir, env, }) {
    return await Promise.all(platforms.map(async (platform) => {
        return {
            platform,
            runtimeVersionInfo: await getRuntimeVersionInfoForPlatformAsync({
                exp,
                platform,
                workflow: workflows[platform],
                projectDir,
                env,
            }),
        };
    }));
}
async function getRuntimeVersionInfoForPlatformAsync({ exp, platform, workflow, projectDir, env, }) {
    if (await (0, projectUtils_1.isModernExpoUpdatesCLIWithRuntimeVersionCommandSupportedAsync)(projectDir)) {
        try {
            const runtimeVersionResult = await (0, resolveRuntimeVersionAsync_1.resolveRuntimeVersionUsingCLIAsync)({
                platform,
                workflow,
                projectDir,
                env,
            });
            return {
                ...runtimeVersionResult,
                runtimeVersion: (0, nullthrows_1.default)(runtimeVersionResult.runtimeVersion, `Unable to determine runtime version for ${platform_1.requestedPlatformDisplayNames[platform]}. ${(0, log_1.learnMore)('https://docs.expo.dev/eas-update/runtime-versions/')}`),
            };
        }
        catch (e) {
            // if it's a known set of errors thrown by the CLI it means that we need to default back to the
            // previous behavior, otherwise we throw the error since something is wrong
            if (!(e instanceof expoUpdatesCli_1.ExpoUpdatesCLIModuleNotFoundError)) {
                throw e;
            }
        }
    }
    const runtimeVersion = exp[platform]?.runtimeVersion ?? exp.runtimeVersion;
    if (typeof runtimeVersion === 'object') {
        if (workflow !== eas_build_job_1.Workflow.MANAGED) {
            throw new Error(`You're currently using the bare workflow, where runtime version policies are not supported. You must set your runtime version manually. For example, define your runtime version as "1.0.0", not {"policy": "appVersion"} in your app config. ${(0, log_1.learnMore)('https://docs.expo.dev/eas-update/runtime-versions')}`);
        }
    }
    const resolvedRuntimeVersion = await config_plugins_1.Updates.getRuntimeVersionAsync(projectDir, exp, platform);
    if (!resolvedRuntimeVersion) {
        throw new Error(`Unable to determine runtime version for ${platform_1.requestedPlatformDisplayNames[platform]}. ${(0, log_1.learnMore)('https://docs.expo.dev/eas-update/runtime-versions/')}`);
    }
    return {
        runtimeVersion: resolvedRuntimeVersion,
        expoUpdatesRuntimeFingerprint: null,
        expoUpdatesRuntimeFingerprintHash: null,
    };
}
function getRuntimeToPlatformsAndFingerprintInfoMappingFromRuntimeVersionInfoObjects(runtimeVersionInfoObjects) {
    const groupedRuntimeVersionInfoObjects = (0, groupBy_1.default)(runtimeVersionInfoObjects, runtimeVersionInfoObject => runtimeVersionInfoObject.runtimeVersionInfo.runtimeVersion);
    return Object.entries(groupedRuntimeVersionInfoObjects).map(([runtimeVersion, runtimeVersionInfoObjects]) => {
        return {
            runtimeVersion,
            platforms: runtimeVersionInfoObjects.map(runtimeVersionInfoObject => runtimeVersionInfoObject.platform),
            expoUpdatesRuntimeFingerprint: runtimeVersionInfoObjects.map(runtimeVersionInfoObject => runtimeVersionInfoObject.runtimeVersionInfo.expoUpdatesRuntimeFingerprint)[0] ?? null,
            expoUpdatesRuntimeFingerprintHash: runtimeVersionInfoObjects.map(runtimeVersionInfoObject => runtimeVersionInfoObject.runtimeVersionInfo.expoUpdatesRuntimeFingerprintHash)[0] ?? null,
        };
    });
}
async function maybeCalculateFingerprintForRuntimeVersionInfoObjectsWithoutExpoUpdatesAsync({ projectDir, graphqlClient, runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMapping, workflowsByPlatform, env, }) {
    const runtimesToComputeFingerprintsFor = runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMapping.filter(infoGroup => !infoGroup.expoUpdatesRuntimeFingerprintHash);
    const fingerprintOptionsByRuntimeAndPlatform = new Map();
    for (const infoGroup of runtimesToComputeFingerprintsFor) {
        for (const platform of infoGroup.platforms) {
            const runtimeAndPlatform = `${infoGroup.runtimeVersion}-${platform}`;
            const options = {
                platforms: [platform],
                workflow: workflowsByPlatform[platform],
                projectDir,
                env,
            };
            fingerprintOptionsByRuntimeAndPlatform.set(runtimeAndPlatform, options);
        }
    }
    const fingerprintsByRuntimeAndPlatform = await (0, cli_1.createFingerprintsByKeyAsync)(projectDir, fingerprintOptionsByRuntimeAndPlatform);
    const uploadedFingerprintsByRuntimeAndPlatform = await (0, mapMapAsync_1.default)(fingerprintsByRuntimeAndPlatform, async (fingerprint) => {
        return {
            ...fingerprint,
            uploadedSource: (await (0, maybeUploadFingerprintAsync_1.maybeUploadFingerprintAsync)({
                hash: fingerprint.hash,
                fingerprint: {
                    fingerprintSources: fingerprint.sources,
                    isDebugFingerprintSource: fingerprint.isDebugSource,
                },
                graphqlClient,
            })).fingerprintSource,
        };
    });
    const runtimesWithComputedFingerprint = runtimesToComputeFingerprintsFor.map(runtimeInfo => {
        const fingerprintInfoGroup = {};
        for (const platform of runtimeInfo.platforms) {
            const runtimeAndPlatform = `${runtimeInfo.runtimeVersion}-${platform}`;
            const fingerprint = uploadedFingerprintsByRuntimeAndPlatform.get(runtimeAndPlatform);
            if (fingerprint?.uploadedSource) {
                fingerprintInfoGroup[platform] = {
                    fingerprintHash: fingerprint.hash,
                    fingerprintSource: fingerprint.uploadedSource,
                };
            }
        }
        return {
            ...runtimeInfo,
            fingerprintInfoGroup,
        };
    });
    // These are runtimes whose fingerprint has already been computed and uploaded with EAS Update fingerprint runtime policy
    const runtimesWithPreviouslyComputedFingerprints = runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMapping
        .filter((infoGroup) => !!infoGroup.expoUpdatesRuntimeFingerprintHash &&
        !!infoGroup.expoUpdatesRuntimeFingerprintSource)
        .map(infoGroup => {
        const platform = infoGroup.platforms[0];
        return {
            ...infoGroup,
            fingerprintInfoGroup: {
                [platform]: {
                    fingerprintHash: infoGroup.expoUpdatesRuntimeFingerprintHash,
                    fingerprintSource: infoGroup.expoUpdatesRuntimeFingerprintSource,
                },
            },
        };
    });
    return [...runtimesWithComputedFingerprint, ...runtimesWithPreviouslyComputedFingerprints];
}
async function findCompatibleBuildsAsync(graphqlClient, appId, runtimeToPlatformsAndFingerprintInfoMapping) {
    const { fingerprintInfoGroup } = runtimeToPlatformsAndFingerprintInfoMapping;
    const entriesPromises = Object.entries(fingerprintInfoGroup).map(async ([platform, fingerprintInfo]) => {
        const build = (await (0, builds_1.fetchBuildsAsync)({
            graphqlClient,
            projectId: appId,
            filters: {
                fingerprintHash: fingerprintInfo.fingerprintHash,
            },
        }))[0];
        return [platform, { ...fingerprintInfo, build }];
    });
    const entries = await Promise.all(entriesPromises);
    const fingerprintInfoGroupWithCompatibleBuilds = Object.fromEntries(entries);
    return {
        ...runtimeToPlatformsAndFingerprintInfoMapping,
        fingerprintInfoGroupWithCompatibleBuilds,
    };
}
exports.platformDisplayNames = {
    android: 'Android',
    ios: 'iOS',
};
async function getRuntimeToUpdateRolloutInfoGroupMappingAsync(graphqlClient, { appId, branchName, rolloutPercentage, runtimeToPlatformsAndFingerprintInfoMapping, }) {
    const runtimeToPlatformsMap = new Map(runtimeToPlatformsAndFingerprintInfoMapping.map(r => [r.runtimeVersion, r.platforms]));
    return await (0, mapMapAsync_1.default)(runtimeToPlatformsMap, async (platforms, runtimeVersion) => {
        return await getUpdateRolloutInfoGroupAsync(graphqlClient, {
            appId,
            branchName,
            rolloutPercentage,
            runtimeVersion,
            platforms,
        });
    });
}
async function getUpdateRolloutInfoGroupAsync(graphqlClient, { appId, branchName, rolloutPercentage, runtimeVersion, platforms, }) {
    // note that this could return control updates in different update groups if the update groups only have a single platform
    return Object.fromEntries(await Promise.all(platforms.map(async (platform) => {
        const updateIdForPlatform = await BranchQuery_1.BranchQuery.getLatestUpdateIdOnBranchAsync(graphqlClient, {
            appId,
            branchName,
            runtimeVersion,
            platform: utils_2.updatePublishPlatformToAppPlatform[platform],
        });
        return [platform, { rolloutPercentage, rolloutControlUpdateId: updateIdForPlatform }];
    })));
}
/**
 * Get the command line arguments for source map generation in expo export.
 *
 * Uses --source-maps if provided, otherwise falls back to --dump-sourcemap.
 * SDK 55+ supports --source-maps with a value (e.g., 'inline'), but older SDKs
 * only support it as a boolean flag. Passing a value to older SDKs causes it
 * to be parsed as the project root positional argument.
 */
function getSourceMapExportCommandArgs({ sourceMaps, sdkVersion, }) {
    if (!sourceMaps) {
        return ['--dump-sourcemap'];
    }
    if (sourceMaps === 'false') {
        return [];
    }
    const supportsSourceMapModes = sdkVersion && semver_1.default.satisfies(sdkVersion, '>=55.0.0');
    if (supportsSourceMapModes && sourceMaps !== 'true') {
        return ['--source-maps', sourceMaps];
    }
    return ['--source-maps'];
}
