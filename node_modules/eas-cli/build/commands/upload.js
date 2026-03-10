"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const config_plugins_1 = require("@expo/config-plugins");
const eas_build_job_1 = require("@expo/eas-build-job");
const core_1 = require("@oclif/core");
const fast_glob_1 = tslib_1.__importDefault(require("fast-glob"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const node_stream_zip_1 = tslib_1.__importDefault(require("node-stream-zip"));
const path_1 = tslib_1.__importDefault(require("path"));
const tar = tslib_1.__importStar(require("tar"));
const uuid_1 = require("uuid");
const url_1 = require("../build/utils/url");
const EasCommand_1 = tslib_1.__importDefault(require("../commandUtils/EasCommand"));
const flags_1 = require("../commandUtils/flags");
const generated_1 = require("../graphql/generated");
const FingerprintMutation_1 = require("../graphql/mutations/FingerprintMutation");
const LocalBuildMutation_1 = require("../graphql/mutations/LocalBuildMutation");
const AppPlatform_1 = require("../graphql/types/AppPlatform");
const log_1 = tslib_1.__importDefault(require("../log"));
const prompts_1 = require("../prompts");
const xcode = tslib_1.__importStar(require("../run/ios/xcode"));
const uploads_1 = require("../uploads");
const date_1 = require("../utils/date");
const json_1 = require("../utils/json");
const paths_1 = require("../utils/paths");
const plist_1 = require("../utils/plist");
const progress_1 = require("../utils/progress");
class BuildUpload extends EasCommand_1.default {
    static description = 'upload a local build and generate a sharable link';
    static flags = {
        platform: core_1.Flags.option({
            char: 'p',
            options: [eas_build_job_1.Platform.IOS, eas_build_job_1.Platform.ANDROID],
        })(),
        'build-path': core_1.Flags.string({
            description: 'Path for the local build',
        }),
        fingerprint: core_1.Flags.string({
            description: 'Fingerprint hash of the local build',
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags } = await this.parse(BuildUpload);
        const { 'build-path': buildPath, fingerprint: manualFingerprintHash } = flags;
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(BuildUpload, {
            nonInteractive,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        const platform = await this.selectPlatformAsync({ platform: flags.platform, nonInteractive });
        const localBuildPath = await resolveLocalBuildPathAsync({
            platform,
            inputBuildPath: buildPath,
            nonInteractive,
        });
        const { fingerprintHash: buildFingerprintHash, developmentClient, simulator, ...otherMetadata } = await extractAppMetadataAsync(localBuildPath, platform);
        let fingerprint = manualFingerprintHash ?? buildFingerprintHash;
        if (fingerprint) {
            if (manualFingerprintHash &&
                buildFingerprintHash &&
                manualFingerprintHash !== buildFingerprintHash &&
                !nonInteractive) {
                const selectedAnswer = await (0, prompts_1.promptAsync)({
                    name: 'fingerprint',
                    message: `The provided fingerprint hash ${manualFingerprintHash} does not match the fingerprint hash of the build ${buildFingerprintHash}. Which fingerprint do you want to use?`,
                    type: 'select',
                    choices: [
                        { title: manualFingerprintHash, value: manualFingerprintHash },
                        { title: buildFingerprintHash, value: buildFingerprintHash },
                    ],
                });
                fingerprint = String(selectedAnswer.fingerprint);
            }
            await FingerprintMutation_1.FingerprintMutation.createFingerprintAsync(graphqlClient, projectId, {
                hash: fingerprint,
            });
        }
        log_1.default.log(`Using build ${localBuildPath}`);
        log_1.default.log(`Fingerprint hash: ${fingerprint ?? 'Unknown'}`);
        log_1.default.log('Uploading your app archive to EAS');
        const bucketKey = await uploadAppArchiveAsync(graphqlClient, localBuildPath);
        const build = await LocalBuildMutation_1.LocalBuildMutation.createLocalBuildAsync(graphqlClient, projectId, { platform: (0, AppPlatform_1.toAppPlatform)(platform), simulator }, { type: generated_1.LocalBuildArchiveSourceType.Gcs, bucketKey }, {
            distribution: generated_1.DistributionType.Internal,
            fingerprintHash: fingerprint,
            developmentClient,
            ...otherMetadata,
        });
        if (jsonFlag) {
            (0, json_1.printJsonOnlyOutput)({ url: (0, url_1.getBuildLogsUrl)(build) });
            return;
        }
        log_1.default.withTick(`Shareable link to the build: ${(0, url_1.getBuildLogsUrl)(build)}`);
    }
    async selectPlatformAsync({ nonInteractive, platform, }) {
        if (nonInteractive && !platform) {
            throw new Error('Platform must be provided in non-interactive mode');
        }
        if (platform) {
            return platform;
        }
        const { resolvedPlatform } = await (0, prompts_1.promptAsync)({
            type: 'select',
            message: 'Select platform',
            name: 'resolvedPlatform',
            choices: [
                { title: 'Android', value: eas_build_job_1.Platform.ANDROID },
                { title: 'iOS', value: eas_build_job_1.Platform.IOS },
            ],
        });
        return resolvedPlatform;
    }
}
exports.default = BuildUpload;
async function resolveLocalBuildPathAsync({ platform, inputBuildPath, nonInteractive, }) {
    const rootDir = process.cwd();
    let applicationArchivePatternOrPath = [];
    if (inputBuildPath) {
        applicationArchivePatternOrPath.push(inputBuildPath);
    }
    else if (platform === eas_build_job_1.Platform.ANDROID) {
        applicationArchivePatternOrPath.push('android/app/build/outputs/**/*.{apk,aab}');
    }
    else {
        const xcworkspacePath = await xcode.resolveXcodeProjectAsync(rootDir);
        const schemes = config_plugins_1.IOSConfig.BuildScheme.getRunnableSchemesFromXcodeproj(rootDir);
        if (xcworkspacePath && schemes.length > 0) {
            for (const scheme of schemes) {
                const buildSettings = await xcode.getXcodeBuildSettingsAsync(xcworkspacePath, scheme.name);
                applicationArchivePatternOrPath = applicationArchivePatternOrPath.concat(buildSettings.map(({ buildSettings }) => `${buildSettings.BUILD_DIR}/**/*.app`));
            }
        }
    }
    let applicationArchives = await findArtifactsAsync({
        rootDir,
        patternOrPathArray: applicationArchivePatternOrPath,
    });
    if (applicationArchives.length === 0 && !nonInteractive && !inputBuildPath) {
        log_1.default.warn(`No application archives found at ${applicationArchivePatternOrPath}.`);
        const { path } = await (0, prompts_1.promptAsync)({
            type: 'text',
            name: 'path',
            message: 'Provide a path to the application archive:',
            validate: value => (value ? true : 'Path may not be empty.'),
        });
        applicationArchives = await findArtifactsAsync({
            rootDir,
            patternOrPathArray: [path],
        });
    }
    if (applicationArchives.length === 1) {
        return applicationArchives[0];
    }
    if (applicationArchives.length > 1) {
        // sort by modification time
        const applicationArchivesInfo = await Promise.all(applicationArchives.map(async (archivePath) => ({
            path: archivePath,
            stat: await fs_extra_1.default.stat(archivePath),
        })));
        applicationArchivesInfo.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
        if (nonInteractive) {
            return applicationArchivesInfo[0].path;
        }
        const { selectedPath } = await (0, prompts_1.promptAsync)({
            type: 'select',
            name: 'selectedPath',
            message: 'Found multiple application archives. Select one:',
            choices: applicationArchivesInfo.map(archive => {
                return {
                    title: `${archive.path.startsWith(rootDir) ? path_1.default.relative(rootDir, archive.path) : archive.path} (${(0, date_1.fromNow)(archive.stat.mtime)} ago)`,
                    value: archive.path,
                };
            }),
        });
        return selectedPath;
    }
    throw new Error(`Found no application archives at ${inputBuildPath}.`);
}
async function findArtifactsAsync({ rootDir, patternOrPathArray, }) {
    const files = new Set();
    for (const patternOrPath of patternOrPathArray) {
        if (path_1.default.isAbsolute(patternOrPath) && (await fs_extra_1.default.pathExists(patternOrPath))) {
            files.add(patternOrPath);
        }
        else {
            const filesFound = await (0, fast_glob_1.default)(patternOrPath, {
                cwd: rootDir,
                onlyFiles: false,
            });
            filesFound.forEach(file => files.add(file));
        }
    }
    return [...files].map(filePath => {
        // User may provide an absolute path as input in which case
        // fg will return an absolute path.
        if (path_1.default.isAbsolute(filePath)) {
            return filePath;
        }
        // User may also provide a relative path in which case
        // fg will return a path relative to rootDir.
        return path_1.default.join(rootDir, filePath);
    });
}
async function uploadAppArchiveAsync(graphqlClient, originalPath) {
    let filePath = originalPath;
    if ((await fs_extra_1.default.stat(filePath)).isDirectory()) {
        await fs_extra_1.default.mkdirp((0, paths_1.getTmpDirectory)());
        const tarPath = path_1.default.join((0, paths_1.getTmpDirectory)(), `${(0, uuid_1.v4)()}.tar.gz`);
        const parentPath = path_1.default.dirname(originalPath);
        const folderName = path_1.default.basename(originalPath);
        await tar.create({ cwd: parentPath, file: tarPath, gzip: true }, [folderName]);
        filePath = tarPath;
    }
    const fileSize = (await fs_extra_1.default.stat(filePath)).size;
    const bucketKey = await (0, uploads_1.uploadFileAtPathToGCSAsync)(graphqlClient, generated_1.UploadSessionType.EasShareGcsAppArchive, filePath, (0, progress_1.createProgressTracker)({
        total: fileSize,
        message: 'Uploading to EAS',
        completedMessage: 'Uploaded to EAS',
    }));
    return bucketKey;
}
function getInfoPlistMetadata(infoPlist) {
    const appName = infoPlist?.CFBundleDisplayName ?? infoPlist?.CFBundleName;
    const appIdentifier = infoPlist?.CFBundleIdentifier;
    const simulator = infoPlist?.DTPlatformName?.includes('simulator');
    return {
        appName,
        appIdentifier,
        simulator,
    };
}
async function extractAppMetadataAsync(buildPath, platform) {
    let developmentClient = false;
    let fingerprintHash;
    // By default, we assume the iOS apps are for simulators
    let simulator = platform === eas_build_job_1.Platform.IOS;
    let appName;
    let appIdentifier;
    const basePath = platform === eas_build_job_1.Platform.ANDROID ? 'assets/' : buildPath;
    const fingerprintFilePath = platform === eas_build_job_1.Platform.ANDROID ? 'fingerprint' : 'EXUpdates.bundle/fingerprint';
    const devMenuBundlePath = platform === eas_build_job_1.Platform.ANDROID ? 'EXDevMenuApp.android.js' : 'EXDevMenu.bundle/';
    const buildExtension = path_1.default.extname(buildPath);
    if (['.apk', '.aab'].includes(buildExtension)) {
        const zip = new node_stream_zip_1.default.async({ file: buildPath });
        try {
            developmentClient = Boolean(await zip.entry(path_1.default.join(basePath, devMenuBundlePath)));
            if (await zip.entry(path_1.default.join(basePath, fingerprintFilePath))) {
                fingerprintHash = (await zip.entryData(path_1.default.join(basePath, fingerprintFilePath))).toString('utf-8');
            }
        }
        catch (err) {
            log_1.default.error(`Error reading ${buildExtension}: ${err}`);
        }
        finally {
            await zip.close();
        }
    }
    else if (buildExtension === '.app') {
        developmentClient = await fs_extra_1.default.exists(path_1.default.join(basePath, devMenuBundlePath));
        if (await fs_extra_1.default.exists(path_1.default.join(basePath, 'Info.plist'))) {
            const infoPlistBuffer = await fs_extra_1.default.readFile(path_1.default.join(basePath, 'Info.plist'));
            const infoPlist = (0, plist_1.parseBinaryPlistBuffer)(infoPlistBuffer);
            ({ simulator, appIdentifier, appName } = getInfoPlistMetadata(infoPlist));
        }
        if (await fs_extra_1.default.exists(path_1.default.join(basePath, fingerprintFilePath))) {
            fingerprintHash = await fs_extra_1.default.readFile(path_1.default.join(basePath, fingerprintFilePath), 'utf8');
        }
    }
    else if (buildExtension === '.ipa') {
        const zip = new node_stream_zip_1.default.async({ file: buildPath });
        try {
            const entries = await zip.entries();
            const entriesKeys = Object.keys(entries);
            await Promise.all(entriesKeys.map(async (path) => {
                const infoPlistRegex = /^Payload\/[^/]+\.app\/Info\.plist$/;
                if (infoPlistRegex.test(path)) {
                    const infoPlistBuffer = await zip.entryData(entries[path]);
                    const infoPlist = (0, plist_1.parseBinaryPlistBuffer)(infoPlistBuffer);
                    ({ simulator, appIdentifier, appName } = getInfoPlistMetadata(infoPlist));
                    return;
                }
                if (path.includes('/EXDevMenu.bundle')) {
                    developmentClient = true;
                    return;
                }
                if (path.includes('EXUpdates.bundle/fingerprint')) {
                    fingerprintHash = (await zip.entryData(entries[path])).toString('utf-8');
                }
            }));
        }
        catch (err) {
            log_1.default.error(`Error reading ${buildExtension}: ${err}`);
        }
        finally {
            await zip.close();
        }
    }
    else {
        // Use tar to list files in the archive
        try {
            let fingerprintHashPromise;
            let infoPlistPromise;
            await tar.list({
                file: buildPath,
                // eslint-disable-next-line async-protect/async-suffix
                onentry: entry => {
                    if (entry.path.endsWith(devMenuBundlePath)) {
                        developmentClient = true;
                    }
                    if (entry.path.endsWith(fingerprintFilePath)) {
                        fingerprintHashPromise = new Promise(async (resolve, reject) => {
                            try {
                                let content = '';
                                for await (const chunk of entry) {
                                    content += chunk.toString('utf8');
                                }
                                resolve(content);
                            }
                            catch (error) {
                                reject(error);
                            }
                        });
                    }
                    if (entry.path.endsWith('Info.plist')) {
                        infoPlistPromise = new Promise(async (resolve, reject) => {
                            try {
                                const chunks = [];
                                for await (const chunk of entry) {
                                    chunks.push(chunk);
                                }
                                const content = Buffer.concat(chunks);
                                resolve(content);
                            }
                            catch (error) {
                                reject(error);
                            }
                        });
                    }
                },
            });
            if (fingerprintHashPromise !== undefined) {
                fingerprintHash = await fingerprintHashPromise;
            }
            if (infoPlistPromise !== undefined) {
                const infoPlist = (0, plist_1.parseBinaryPlistBuffer)(await infoPlistPromise);
                ({ simulator, appIdentifier, appName } = getInfoPlistMetadata(infoPlist));
            }
        }
        catch (err) {
            log_1.default.error(`Error reading ${buildExtension}: ${err}`);
        }
    }
    return {
        developmentClient,
        fingerprintHash,
        simulator,
        appName,
        appIdentifier,
    };
}
