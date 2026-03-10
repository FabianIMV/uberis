"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessSourceMapsArg = preprocessSourceMapsArg;
const tslib_1 = require("tslib");
const eas_build_job_1 = require("@expo/eas-build-job");
const eas_json_1 = require("@expo/eas-json");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const queries_1 = require("../../branch/queries");
const repository_1 = require("../../build/utils/repository");
const url_1 = require("../../build/utils/url");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const utils_1 = require("../../update/utils");
const pagination_1 = require("../../commandUtils/pagination");
const fetch_1 = tslib_1.__importDefault(require("../../fetch"));
const generated_1 = require("../../graphql/generated");
const PublishMutation_1 = require("../../graphql/mutations/PublishMutation");
const log_1 = tslib_1.__importStar(require("../../log"));
const ora_1 = require("../../ora");
const platform_1 = require("../../platform");
const maybeUploadAssetMapAsync_1 = require("../../project/maybeUploadAssetMapAsync");
const maybeUploadFingerprintAsync_1 = require("../../project/maybeUploadFingerprintAsync");
const projectUtils_1 = require("../../project/projectUtils");
const publish_1 = require("../../project/publish");
const workflow_1 = require("../../project/workflow");
const configure_1 = require("../../update/configure");
const utils_2 = require("../../update/utils");
const code_signing_1 = require("../../utils/code-signing");
const areSetsEqual_1 = tslib_1.__importDefault(require("../../utils/expodash/areSetsEqual"));
const uniqBy_1 = tslib_1.__importDefault(require("../../utils/expodash/uniqBy"));
const formatFields_1 = tslib_1.__importDefault(require("../../utils/formatFields"));
const json_1 = require("../../utils/json");
const statuspageService_1 = require("../../utils/statuspageService");
const prompts_1 = require("../../utils/prompts");
/**
 * Preprocess argv to handle --source-maps with optional value.
 * If --source-maps is followed by another flag (starts with -) or end of args,
 * insert 'true' as the default value.
 */
function preprocessSourceMapsArg(argv) {
    const result = [];
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        result.push(arg);
        if (arg === '--source-maps') {
            const nextArg = argv[i + 1];
            // If no next arg or next arg is a flag, insert 'true' as the value
            if (nextArg === undefined || nextArg.startsWith('-')) {
                result.push('true');
            }
        }
    }
    return result;
}
class UpdatePublish extends EasCommand_1.default {
    static description = 'publish an update group';
    static flags = {
        branch: core_1.Flags.string({
            description: 'Branch to publish the update group on',
            required: false,
        }),
        channel: core_1.Flags.string({
            description: 'Channel that the published update should affect',
            required: false,
        }),
        message: core_1.Flags.string({
            char: 'm',
            description: 'A short message describing the update',
            required: false,
        }),
        'input-dir': core_1.Flags.string({
            description: 'Location of the bundle',
            default: 'dist',
            required: false,
        }),
        'skip-bundler': core_1.Flags.boolean({
            description: `Skip running Expo CLI to bundle the app before publishing`,
            default: false,
        }),
        'clear-cache': core_1.Flags.boolean({
            description: `Clear the bundler cache before publishing`,
            default: false,
        }),
        'no-bytecode': core_1.Flags.boolean({
            description: `Skip generating Hermes bytecode (output plain JavaScript instead)`,
            default: false,
            hidden: true,
        }),
        'source-maps': core_1.Flags.string({
            description: `Emit source maps. Options: true (default), inline, false`,
            default: 'true',
            hidden: true,
        }),
        'emit-metadata': core_1.Flags.boolean({
            description: `Emit "eas-update-metadata.json" in the bundle folder with detailed information about the generated updates`,
            default: false,
        }),
        'rollout-percentage': core_1.Flags.integer({
            description: `Percentage of users this update should be immediately available to. Users not in the rollout will be served the previous latest update on the branch, even if that update is itself being rolled out. The specified number must be an integer between 1 and 100. When not specified, this defaults to 100.`,
            required: false,
            min: 0,
            max: 100,
        }),
        platform: core_1.Flags.option({
            char: 'p',
            options: Object.values(platform_1.RequestedPlatform), // TODO: Add web when it's fully supported
            default: platform_1.RequestedPlatform.All,
            required: false,
        })(),
        auto: core_1.Flags.boolean({
            description: 'Use the current git branch and commit message for the EAS branch and update message',
            default: false,
        }),
        'private-key-path': core_1.Flags.string({
            description: `File containing the PEM-encoded private key corresponding to the certificate in expo-updates' configuration. Defaults to a file named "private-key.pem" in the certificate's directory. Only relevant if you are using code signing: https://docs.expo.dev/eas-update/code-signing/`,
            required: false,
        }),
        ...flags_1.EasUpdateEnvironmentRequiredFlag,
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Vcs,
        ...this.ContextOptions.ServerSideEnvironmentVariables,
    };
    async runAsync() {
        // Preprocess argv to handle --source-maps with optional value
        const preprocessedArgv = preprocessSourceMapsArg(this.argv);
        const { flags: rawFlags } = await this.parse(UpdatePublish, preprocessedArgv);
        const paginatedQueryOptions = (0, pagination_1.getPaginatedQueryOptions)(rawFlags);
        const { auto: autoFlag, platform: requestedPlatform, channelName: channelNameArg, updateMessage: updateMessageArg, inputDir, skipBundler, clearCache, noBytecode, sourceMaps, privateKeyPath, json: jsonFlag, nonInteractive, branchName: branchNameArg, emitMetadata, rolloutPercentage, environment: environmentFromFlags, } = this.sanitizeFlags(rawFlags);
        const { getDynamicPublicProjectConfigAsync, getDynamicPrivateProjectConfigAsync, loggedIn: { graphqlClient }, vcsClient, getServerSideEnvironmentVariablesAsync, } = await this.getContextAsync(UpdatePublish, {
            nonInteractive,
            withServerSideEnvironment: environmentFromFlags ?? null,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        await vcsClient.ensureRepoExistsAsync();
        await (0, repository_1.ensureRepoIsCleanAsync)(vcsClient, nonInteractive);
        const { exp: expPossiblyWithoutEasUpdateConfigured, projectId, projectDir, } = await getDynamicPublicProjectConfigAsync();
        let environment = environmentFromFlags;
        // Environment handling
        if (!autoFlag &&
            (0, utils_1.environmentFlagNeededForSdk550OrGreater)({
                sdkVersion: expPossiblyWithoutEasUpdateConfigured.sdkVersion,
                environment: environmentFromFlags,
            })) {
            environment = await (0, prompts_1.promptVariableEnvironmentAsync)({
                multiple: false,
                graphqlClient,
                nonInteractive,
                projectId,
            });
        }
        await (0, statuspageService_1.maybeWarnAboutEasOutagesAsync)(graphqlClient, [generated_1.StatuspageServiceName.EasUpdate]);
        const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
        const easJsonCliConfig = (await eas_json_1.EasJsonUtils.getCliConfigAsync(easJsonAccessor)) ?? {};
        await (0, configure_1.ensureEASUpdateIsConfiguredAsync)({
            exp: expPossiblyWithoutEasUpdateConfigured,
            platform: requestedPlatform,
            projectDir,
            projectId,
            vcsClient,
            env: undefined,
            manifestHostOverride: easJsonCliConfig.updateManifestHostOverride ?? null,
        });
        const { exp } = await getDynamicPublicProjectConfigAsync();
        const { exp: expPrivate } = await getDynamicPrivateProjectConfigAsync();
        const codeSigningInfo = await (0, code_signing_1.getCodeSigningInfoAsync)(expPrivate, privateKeyPath);
        const branchName = await (0, publish_1.getBranchNameForCommandAsync)({
            graphqlClient,
            vcsClient,
            projectId,
            channelNameArg,
            branchNameArg,
            autoFlag,
            nonInteractive,
            paginatedQueryOptions,
        });
        const updateMessage = await (0, publish_1.getUpdateMessageForCommandAsync)(vcsClient, {
            updateMessageArg,
            autoFlag,
            nonInteractive,
            jsonFlag,
        });
        const maybeServerEnv = environmentFromFlags
            ? {
                ...(await getServerSideEnvironmentVariablesAsync()),
                EXPO_NO_DOTENV: '1',
            }
            : {};
        // build bundle and upload assets for a new publish
        if (!skipBundler) {
            const bundleSpinner = (0, ora_1.ora)().start('Exporting...');
            try {
                await (0, publish_1.buildBundlesAsync)({
                    projectDir,
                    inputDir,
                    exp,
                    platformFlag: requestedPlatform,
                    clearCache,
                    noBytecode,
                    sourceMaps,
                    extraEnv: maybeServerEnv,
                });
                bundleSpinner.succeed('Exported bundle(s)');
            }
            catch (e) {
                bundleSpinner.fail('Export failed');
                throw e;
            }
        }
        // After possibly bundling, assert that the input directory can be found.
        const distRoot = await (0, publish_1.resolveInputDirectoryAsync)(inputDir, {
            skipBundler,
        });
        const assetSpinner = (0, ora_1.ora)().start('Uploading...');
        let unsortedUpdateInfoGroups = {};
        let uploadedAssetCount = 0;
        let assetLimitPerUpdateGroup = 0;
        let realizedPlatforms = [];
        let assetMapSource = null;
        try {
            const [collectedAssets, maybeAssetMapSource] = await Promise.all([
                (0, publish_1.collectAssetsAsync)(distRoot),
                (0, maybeUploadAssetMapAsync_1.maybeUploadAssetMapAsync)(distRoot, graphqlClient),
            ]);
            assetMapSource = maybeAssetMapSource;
            const assets = (0, publish_1.filterCollectedAssetsByRequestedPlatforms)(collectedAssets, requestedPlatform);
            realizedPlatforms = Object.keys(assets);
            // Timeout mechanism:
            // - Start with NO_ACTIVITY_TIMEOUT. 180 seconds is chosen because the cloud function that processes
            //   uploaded assets has a timeout of 60 seconds and uploading can take some time on a slow connection.
            // - Each time one or more assets reports as ready, reset the timeout.
            // - Each time an asset upload begins, reset the timeout. This includes retries.
            // - Start upload. Internally, uploadAssetsAsync uploads them all first and then checks for successful
            //   processing every (5 + n) seconds with a linear backoff of n + 1 second.
            // - At the same time as upload is started, start timeout checker which checks every 1 second to see
            //   if timeout has been reached. When timeout expires, send a cancellation signal to currently running
            //   upload function call to instruct it to stop uploading or checking for successful processing.
            const NO_ACTIVITY_TIMEOUT = 180 * 1000; // 180 seconds
            let lastUploadedStorageKeys = new Set();
            let lastAssetUploadResults = [];
            let timeAtWhichToTimeout = Date.now() + NO_ACTIVITY_TIMEOUT;
            const cancelationToken = { isCanceledOrFinished: false };
            const uploadResults = await Promise.race([
                (0, publish_1.uploadAssetsAsync)(graphqlClient, assets, projectId, cancelationToken, assetUploadResults => {
                    const currentUploadedStorageKeys = new Set(assetUploadResults.filter(r => r.finished).map(r => r.asset.storageKey));
                    if (!(0, areSetsEqual_1.default)(currentUploadedStorageKeys, lastUploadedStorageKeys)) {
                        timeAtWhichToTimeout = Date.now() + NO_ACTIVITY_TIMEOUT; // reset timeout to NO_ACTIVITY_TIMEOUT
                        lastUploadedStorageKeys = currentUploadedStorageKeys;
                        lastAssetUploadResults = assetUploadResults;
                    }
                    const totalAssets = assetUploadResults.length;
                    const missingAssetCount = assetUploadResults.filter(a => !a.finished).length;
                    assetSpinner.text = `Uploading (${totalAssets - missingAssetCount}/${totalAssets})`;
                }, () => {
                    // when an upload is retried, reset the timeout as we know this will now need more time
                    timeAtWhichToTimeout = Date.now() + NO_ACTIVITY_TIMEOUT; // reset timeout to NO_ACTIVITY_TIMEOUT
                }),
                (async () => {
                    while (Date.now() < timeAtWhichToTimeout) {
                        if (cancelationToken.isCanceledOrFinished) {
                            break;
                        }
                        await new Promise(res => setTimeout(res, 1000)); // wait 1 second
                    }
                    cancelationToken.isCanceledOrFinished = true;
                    const timedOutAssets = lastAssetUploadResults
                        .filter(r => !r.finished)
                        .map(r => `\n- ${r.asset.originalPath ?? r.asset.path}`);
                    throw new Error(`Asset processing timed out for assets: ${timedOutAssets}`);
                })(),
            ]);
            uploadedAssetCount = uploadResults.uniqueUploadedAssetCount;
            assetLimitPerUpdateGroup = uploadResults.assetLimitPerUpdateGroup;
            unsortedUpdateInfoGroups = await (0, publish_1.buildUnsortedUpdateInfoGroupAsync)(assets, exp);
            // NOTE(cedric): we assume that bundles are always uploaded, and always are part of
            // `uploadedAssetCount`, perferably we don't assume. For that, we need to refactor the
            // `uploadAssetsAsync` and be able to determine asset type from the uploaded assets.
            const uploadedBundleCount = uploadResults.launchAssetCount;
            const uploadedNormalAssetCount = Math.max(0, uploadedAssetCount - uploadedBundleCount);
            const reusedNormalAssetCount = uploadResults.uniqueAssetCount - uploadedNormalAssetCount;
            assetSpinner.stop();
            log_1.default.withTick(`Uploaded ${uploadedBundleCount} app ${uploadedBundleCount === 1 ? 'bundle' : 'bundles'}`);
            if (uploadedNormalAssetCount === 0) {
                log_1.default.withTick(`Uploading assets skipped - no new assets found`);
            }
            else {
                let message = `Uploaded ${uploadedNormalAssetCount} ${uploadedNormalAssetCount === 1 ? 'asset' : 'assets'}`;
                if (reusedNormalAssetCount > 0) {
                    message += ` (reused ${reusedNormalAssetCount} ${reusedNormalAssetCount === 1 ? 'asset' : 'assets'})`;
                }
                log_1.default.withTick(message);
            }
            for (const uploadedAssetPath of uploadResults.uniqueUploadedAssetPaths) {
                log_1.default.debug(chalk_1.default.dim(`- ${uploadedAssetPath}`));
            }
            const platformString = realizedPlatforms
                .map(platform => {
                const collectedAssetForPlatform = (0, nullthrows_1.default)(assets[platform]);
                const totalAssetsForPlatform = collectedAssetForPlatform.assets.length + 1; // launch asset
                const assetString = totalAssetsForPlatform === 1 ? 'asset' : 'assets';
                return `${totalAssetsForPlatform} ${publish_1.platformDisplayNames[platform]} ${assetString}`;
            })
                .join(', ');
            log_1.default.withInfo(`${platformString} (maximum: ${assetLimitPerUpdateGroup} total per update). ${(0, log_1.learnMore)('https://expo.fyi/eas-update-asset-limits', { learnMoreMessage: 'Learn more about asset limits' })}`);
        }
        catch (e) {
            assetSpinner.fail('Failed to upload');
            throw e;
        }
        const workflows = await (0, workflow_1.resolveWorkflowPerPlatformAsync)(projectDir, vcsClient);
        const runtimeVersionInfoObjects = await (0, publish_1.getRuntimeVersionInfoObjectsAsync)({
            exp,
            platforms: realizedPlatforms,
            projectDir,
            workflows: {
                ...workflows,
                web: eas_build_job_1.Workflow.UNKNOWN,
            },
            env: maybeServerEnv,
        });
        const runtimeToPlatformsAndFingerprintInfoMapping = (0, publish_1.getRuntimeToPlatformsAndFingerprintInfoMappingFromRuntimeVersionInfoObjects)(runtimeVersionInfoObjects);
        const { branch } = await (0, queries_1.ensureBranchExistsAsync)(graphqlClient, {
            appId: projectId,
            branchName,
        });
        const runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMappingFromExpoUpdates = await Promise.all(runtimeToPlatformsAndFingerprintInfoMapping.map(async (info) => {
            return {
                ...info,
                expoUpdatesRuntimeFingerprintSource: info.expoUpdatesRuntimeFingerprint
                    ? ((await (0, maybeUploadFingerprintAsync_1.maybeUploadFingerprintAsync)({
                        hash: info.runtimeVersion,
                        fingerprint: info.expoUpdatesRuntimeFingerprint,
                        graphqlClient,
                    })).fingerprintSource ?? null)
                    : null,
            };
        }));
        const runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMapping = await (0, publish_1.maybeCalculateFingerprintForRuntimeVersionInfoObjectsWithoutExpoUpdatesAsync)({
            projectDir,
            graphqlClient,
            runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMapping: runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMappingFromExpoUpdates,
            workflowsByPlatform: workflows,
            env: undefined,
        });
        const runtimeVersionToRolloutInfoGroup = rolloutPercentage !== undefined
            ? await (0, publish_1.getRuntimeToUpdateRolloutInfoGroupMappingAsync)(graphqlClient, {
                appId: projectId,
                branchName,
                rolloutPercentage,
                runtimeToPlatformsAndFingerprintInfoMapping,
            })
            : undefined;
        const gitCommitHash = await vcsClient.getCommitHashAsync();
        const isGitWorkingTreeDirty = await vcsClient.hasUncommittedChangesAsync();
        // Sort the updates into different groups based on their platform specific runtime versions
        const updateGroups = runtimeToPlatformsAndFingerprintInfoAndFingerprintSourceMapping.map(({ runtimeVersion, platforms, fingerprintInfoGroup }) => {
            const localUpdateInfoGroup = Object.fromEntries(platforms.map(platform => [
                platform,
                unsortedUpdateInfoGroups[platform],
            ]));
            const rolloutInfoGroupForRuntimeVersion = runtimeVersionToRolloutInfoGroup
                ? runtimeVersionToRolloutInfoGroup.get(runtimeVersion)
                : null;
            const localRolloutInfoGroup = rolloutInfoGroupForRuntimeVersion
                ? Object.fromEntries(platforms.map(platform => [
                    platform,
                    rolloutInfoGroupForRuntimeVersion[platform],
                ]))
                : null;
            const transformedFingerprintInfoGroup = Object.entries(fingerprintInfoGroup).reduce((prev, [platform, fingerprintInfo]) => {
                return {
                    ...prev,
                    [platform]: fingerprintInfo,
                };
            }, {});
            const assetMapGroup = assetMapSource
                ? Object.fromEntries(platforms.map(platform => [platform, assetMapSource]))
                : null;
            return {
                branchId: branch.id,
                updateInfoGroup: localUpdateInfoGroup,
                rolloutInfoGroup: localRolloutInfoGroup,
                fingerprintInfoGroup: transformedFingerprintInfoGroup,
                assetMapGroup,
                runtimeVersion,
                message: updateMessage,
                gitCommitHash,
                isGitWorkingTreeDirty,
                awaitingCodeSigningInfo: !!codeSigningInfo,
                environment: environment ?? null,
                manifestHostOverride: easJsonCliConfig.updateManifestHostOverride ?? null,
                assetHostOverride: easJsonCliConfig.updateAssetHostOverride ?? null,
            };
        });
        let newUpdates;
        const publishSpinner = (0, ora_1.ora)('Publishing...').start();
        try {
            newUpdates = await PublishMutation_1.PublishMutation.publishUpdateGroupAsync(graphqlClient, updateGroups);
            if (codeSigningInfo) {
                log_1.default.log('🔒 Signing updates');
                const updatesTemp = [...newUpdates];
                const updateGroupsAndTheirUpdates = updateGroups.map(updateGroup => {
                    const newUpdates = updatesTemp.splice(0, Object.keys((0, nullthrows_1.default)(updateGroup.updateInfoGroup)).length);
                    return {
                        updateGroup,
                        newUpdates,
                    };
                });
                await Promise.all(updateGroupsAndTheirUpdates.map(async ({ updateGroup, newUpdates }) => {
                    await Promise.all(newUpdates.map(async (newUpdate) => {
                        const response = await (0, fetch_1.default)(newUpdate.manifestPermalink, {
                            method: 'GET',
                            headers: { accept: 'multipart/mixed' },
                        });
                        const manifestBody = (0, nullthrows_1.default)(await (0, code_signing_1.getManifestBodyAsync)(response));
                        (0, code_signing_1.checkManifestBodyAgainstUpdateInfoGroup)(manifestBody, (0, nullthrows_1.default)((0, nullthrows_1.default)(updateGroup.updateInfoGroup)[newUpdate.platform]));
                        const manifestSignature = (0, code_signing_1.signBody)(manifestBody, codeSigningInfo);
                        await PublishMutation_1.PublishMutation.setCodeSigningInfoAsync(graphqlClient, newUpdate.id, {
                            alg: codeSigningInfo.codeSigningMetadata.alg,
                            keyid: codeSigningInfo.codeSigningMetadata.keyid,
                            sig: manifestSignature,
                        });
                    }));
                }));
            }
            publishSpinner.succeed('Published!');
        }
        catch (e) {
            publishSpinner.fail('Failed to publish updates');
            throw e;
        }
        if ((0, utils_2.isBundleDiffingEnabled)(exp)) {
            await (0, utils_2.prewarmDiffingAsync)(graphqlClient, projectId, newUpdates);
        }
        if (!skipBundler && emitMetadata) {
            log_1.default.log('Generating eas-update-metadata.json');
            await (0, publish_1.generateEasMetadataAsync)(distRoot, (0, utils_2.getUpdateJsonInfosForUpdates)(newUpdates));
        }
        if (jsonFlag) {
            (0, json_1.printJsonOnlyOutput)((0, utils_2.getUpdateJsonInfosForUpdates)(newUpdates));
            return;
        }
        if (new Set(newUpdates.map(update => update.group)).size > 1) {
            log_1.default.addNewLineIfNone();
            log_1.default.log('👉 Since multiple runtime versions are defined, multiple update groups have been published.');
        }
        log_1.default.addNewLineIfNone();
        for (const runtime of (0, uniqBy_1.default)(runtimeToPlatformsAndFingerprintInfoMapping, version => version.runtimeVersion)) {
            const newUpdatesForRuntimeVersion = newUpdates.filter(update => update.runtimeVersion === runtime.runtimeVersion);
            if (newUpdatesForRuntimeVersion.length === 0) {
                throw new Error(`Publish response is missing updates with runtime ${runtime.runtimeVersion}.`);
            }
            const platforms = newUpdatesForRuntimeVersion.map(update => update.platform);
            const newAndroidUpdate = newUpdatesForRuntimeVersion.find(update => update.platform === 'android');
            const newIosUpdate = newUpdatesForRuntimeVersion.find(update => update.platform === 'ios');
            const updateGroupId = newUpdatesForRuntimeVersion[0].group;
            const projectName = exp.slug;
            const accountName = (await (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(graphqlClient, projectId)).name;
            const updateGroupUrl = (0, url_1.getUpdateGroupUrl)(accountName, projectName, updateGroupId);
            const updateGroupLink = (0, log_1.link)(updateGroupUrl, { dim: false });
            log_1.default.log((0, formatFields_1.default)([
                { label: 'Branch', value: branchName },
                { label: 'Runtime version', value: runtime.runtimeVersion },
                { label: 'Platform', value: platforms.join(', ') },
                { label: 'Update group ID', value: updateGroupId },
                ...(newAndroidUpdate ? [{ label: 'Android update ID', value: newAndroidUpdate.id }] : []),
                ...(newIosUpdate ? [{ label: 'iOS update ID', value: newIosUpdate.id }] : []),
                ...(newAndroidUpdate?.rolloutControlUpdate
                    ? [
                        {
                            label: 'Android Rollout',
                            value: `${newAndroidUpdate.rolloutPercentage}% (Base update ID: ${newAndroidUpdate.rolloutControlUpdate.id})`,
                        },
                    ]
                    : []),
                ...(newIosUpdate?.rolloutControlUpdate
                    ? [
                        {
                            label: 'iOS Rollout',
                            value: `${newIosUpdate.rolloutPercentage}% (Base update ID: ${newIosUpdate.rolloutControlUpdate.id})`,
                        },
                    ]
                    : []),
                { label: 'Message', value: updateMessage ?? '' },
                ...(gitCommitHash
                    ? [
                        {
                            label: 'Commit',
                            value: `${gitCommitHash}${isGitWorkingTreeDirty ? '*' : ''}`,
                        },
                    ]
                    : []),
                { label: 'EAS Dashboard', value: updateGroupLink },
            ]));
            log_1.default.addNewLineIfNone();
            if ((0, publish_1.isUploadedAssetCountAboveWarningThreshold)(uploadedAssetCount, assetLimitPerUpdateGroup)) {
                log_1.default.warn(`This update group contains ${uploadedAssetCount} assets and is nearing the server cap of ${assetLimitPerUpdateGroup}.\n` +
                    `${(0, log_1.learnMore)('https://docs.expo.dev/eas-update/optimize-assets/', {
                        learnMoreMessage: 'Consider optimizing your usage of assets',
                        dim: false,
                    })}.`);
                log_1.default.addNewLineIfNone();
            }
        }
    }
    sanitizeFlags(flags) {
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { auto, branch: branchName, channel: channelName, message: updateMessage } = flags;
        if (nonInteractive && !auto && !(updateMessage && (branchName || channelName))) {
            core_1.Errors.error('--branch and --message, or --channel and --message are required when updating in non-interactive mode unless --auto is specified', { exit: 1 });
        }
        const skipBundler = flags['skip-bundler'] ?? false;
        let emitMetadata = flags['emit-metadata'] ?? false;
        if (skipBundler && emitMetadata) {
            emitMetadata = false;
            log_1.default.warn('ignoring flag --emit-metadata as metadata cannot be generated when skipping bundle generation');
        }
        return {
            auto,
            branchName,
            channelName,
            updateMessage,
            inputDir: flags['input-dir'],
            skipBundler,
            clearCache: flags['clear-cache'] ? true : !!flags['environment'],
            noBytecode: flags['no-bytecode'] ?? false,
            sourceMaps: flags['source-maps'],
            platform: flags.platform,
            privateKeyPath: flags['private-key-path'],
            rolloutPercentage: flags['rollout-percentage'],
            nonInteractive,
            emitMetadata,
            json,
            environment: flags['environment'],
        };
    }
}
exports.default = UpdatePublish;
