"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const better_opn_1 = tslib_1.__importDefault(require("better-opn"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const api_1 = require("../../api");
const queries_1 = require("../../branch/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const builds_1 = require("../../commandUtils/builds");
const flags_1 = require("../../commandUtils/flags");
const cli_1 = require("../../fingerprint/cli");
const diff_1 = require("../../fingerprint/diff");
const utils_1 = require("../../fingerprint/utils");
const AppQuery_1 = require("../../graphql/queries/AppQuery");
const BuildQuery_1 = require("../../graphql/queries/BuildQuery");
const FingerprintQuery_1 = require("../../graphql/queries/FingerprintQuery");
const UpdateQuery_1 = require("../../graphql/queries/UpdateQuery");
const log_1 = tslib_1.__importStar(require("../../log"));
const ora_1 = require("../../ora");
const projectUtils_1 = require("../../project/projectUtils");
const prompts_1 = require("../../prompts");
const queries_2 = require("../../update/queries");
const formatFields_1 = tslib_1.__importDefault(require("../../utils/formatFields"));
const json_1 = require("../../utils/json");
var FingerprintOriginType;
(function (FingerprintOriginType) {
    FingerprintOriginType["Build"] = "build";
    FingerprintOriginType["Update"] = "update";
    FingerprintOriginType["Hash"] = "hash";
    FingerprintOriginType["Project"] = "project";
})(FingerprintOriginType || (FingerprintOriginType = {}));
class FingerprintCompare extends EasCommand_1.default {
    static description = 'compare fingerprints of the current project, builds, and updates';
    static strict = false;
    static examples = [
        '$ eas fingerprint:compare \t # Compare fingerprints in interactive mode',
        '$ eas fingerprint:compare <FINGERPRINT-HASH> \t # Compare fingerprint against local directory',
        '$ eas fingerprint:compare <FINGERPRINT-HASH-1> <FINGERPRINT-HASH-2> \t # Compare provided fingerprints',
        '$ eas fingerprint:compare --build-id <BUILD-ID> \t # Compare fingerprint from build against local directory',
        '$ eas fingerprint:compare --build-id <BUILD-ID> --environment production \t # Compare fingerprint from build against local directory with the "production" environment',
        '$ eas fingerprint:compare --build-id <BUILD-ID-1> --build-id <BUILD-ID-2>\t # Compare fingerprint from a build against another build',
        '$ eas fingerprint:compare --build-id <BUILD-ID> --update-id <UPDATE-ID>\t # Compare fingerprint from build against fingerprint from update',
        '$ eas fingerprint:compare <FINGERPRINT-HASH> --update-id <UPDATE-ID> \t # Compare fingerprint from update against provided fingerprint',
    ];
    static args = {
        hash1: core_1.Args.string({
            description: "If provided alone, HASH1 is compared against the current project's fingerprint.",
            required: false,
        }),
        hash2: core_1.Args.string({
            description: 'If two hashes are provided, HASH1 is compared against HASH2.',
            required: false,
        }),
    };
    static flags = {
        'build-id': core_1.Flags.string({
            aliases: ['buildId'],
            description: 'Compare the fingerprint with the build with the specified ID',
            multiple: true,
        }),
        'update-id': core_1.Flags.string({
            aliases: ['updateId'],
            description: 'Compare the fingerprint with the update with the specified ID',
            multiple: true,
        }),
        open: core_1.Flags.boolean({
            description: 'Open the fingerprint comparison in the browser',
        }),
        environment: core_1.Flags.string({
            ...flags_1.EasEnvironmentFlagParameters,
            description: 'If generating a fingerprint from the local directory, use the specified environment.',
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.ProjectConfig,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Vcs,
        ...this.ContextOptions.ServerSideEnvironmentVariables,
    };
    async runAsync() {
        const { args, flags } = await this.parse(FingerprintCompare);
        const { hash1, hash2 } = args;
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { 'build-id': buildIds, 'update-id': updateIds, open, environment } = flags;
        const [buildId1, buildId2] = buildIds ?? [];
        const [updateId1, updateId2] = updateIds ?? [];
        const { projectId, privateProjectConfig: { projectDir }, loggedIn: { graphqlClient }, vcsClient, getServerSideEnvironmentVariablesAsync, } = await this.getContextAsync(FingerprintCompare, {
            nonInteractive,
            withServerSideEnvironment: environment ?? null,
        });
        if (json) {
            (0, json_1.enableJsonOutput)();
        }
        const firstFingerprintInfo = await getFingerprintInfoAsync(graphqlClient, projectDir, projectId, vcsClient, getServerSideEnvironmentVariablesAsync, {
            nonInteractive,
            buildId: buildId1,
            updateId: updateId1,
            hash: hash1,
        });
        const { fingerprint: firstFingerprint, origin: firstFingerprintOrigin } = firstFingerprintInfo;
        const isFirstFingerprintSpecifiedByFlagOrArg = Boolean(hash1 || buildId1 || updateId1);
        const isSecondFingerprintSpecifiedByFlagOrArg = Boolean(hash2 || buildId2 || updateId2);
        const secondFingerprintInfo = await getFingerprintInfoAsync(graphqlClient, projectDir, projectId, vcsClient, getServerSideEnvironmentVariablesAsync, {
            nonInteractive,
            buildId: buildId2,
            updateId: updateId2,
            hash: hash2,
            useProjectFingerprint: isFirstFingerprintSpecifiedByFlagOrArg && !isSecondFingerprintSpecifiedByFlagOrArg,
            environmentForProjectFingerprint: environment,
        }, firstFingerprintInfo);
        const { fingerprint: secondFingerprint, origin: secondFingerprintOrigin } = secondFingerprintInfo;
        if (json) {
            (0, json_1.printJsonOnlyOutput)({ fingerprint1: firstFingerprint, fingerprint2: secondFingerprint });
            return;
        }
        if (firstFingerprint.hash === secondFingerprint.hash) {
            log_1.default.log(`✅ ${capitalizeFirstLetter(prettyPrintFingerprint(firstFingerprint, firstFingerprintOrigin))} matches ${prettyPrintFingerprint(secondFingerprint, secondFingerprintOrigin)}`);
            return;
        }
        else {
            log_1.default.log(`🔄 ${capitalizeFirstLetter(prettyPrintFingerprint(firstFingerprint, firstFingerprintOrigin))} differs from ${prettyPrintFingerprint(secondFingerprint, secondFingerprintOrigin)}`);
        }
        const fingerprintDiffs = (0, cli_1.diffFingerprint)(projectDir, firstFingerprint, secondFingerprint);
        if (!fingerprintDiffs) {
            log_1.default.error('Fingerprint diffs can only be computed for projects with SDK 52 or higher');
            return;
        }
        const filePathDiffs = fingerprintDiffs.filter(diff => {
            let sourceType;
            if (diff.op === 'added') {
                sourceType = diff.addedSource.type;
            }
            else if (diff.op === 'removed') {
                sourceType = diff.removedSource.type;
            }
            else if (diff.op === 'changed') {
                sourceType = diff.beforeSource.type;
            }
            return sourceType === 'dir' || sourceType === 'file';
        });
        if (filePathDiffs.length > 0) {
            log_1.default.newLine();
            log_1.default.log('📁 Paths with native dependencies:');
        }
        const fields = [];
        for (const diff of filePathDiffs) {
            const field = getDiffFilePathFields(diff);
            if (!field) {
                throw new Error(`Unsupported diff: ${JSON.stringify(diff)}`);
            }
            fields.push(field);
        }
        log_1.default.log((0, formatFields_1.default)(fields, {
            labelFormat: label => `    ${chalk_1.default.dim(label)}:`,
        }));
        const contentDiffs = fingerprintDiffs.filter(diff => {
            let sourceType;
            if (diff.op === 'added') {
                sourceType = diff.addedSource.type;
            }
            else if (diff.op === 'removed') {
                sourceType = diff.removedSource.type;
            }
            else if (diff.op === 'changed') {
                sourceType = diff.beforeSource.type;
            }
            return sourceType === 'contents';
        });
        for (const diff of contentDiffs) {
            printContentDiff(diff);
        }
        if (nonInteractive) {
            return;
        }
        const project = await AppQuery_1.AppQuery.byIdAsync(graphqlClient, projectId);
        const fingerprintCompareUrl = new URL(`/accounts/${project.ownerAccount.name}/projects/${project.slug}/fingerprints/compare/${firstFingerprintInfo.fingerprint.hash}/${secondFingerprintInfo.fingerprint.hash}`, (0, api_1.getExpoWebsiteBaseUrl)());
        if (!open) {
            log_1.default.newLine();
            log_1.default.withInfo(`💡 Use the --open flag to view the comparison in the browser. ${(0, log_1.learnMore)(fingerprintCompareUrl.toString())}`);
            return;
        }
        await (0, better_opn_1.default)(fingerprintCompareUrl.toString());
    }
}
exports.default = FingerprintCompare;
async function getFingerprintInfoAsync(graphqlClient, projectDir, projectId, vcsClient, getServerSideEnvironmentVariablesAsync, { buildId, updateId, hash, useProjectFingerprint, environmentForProjectFingerprint, nonInteractive, }, firstFingerprintInfo) {
    if (hash) {
        return await getFingerprintInfoFromHashAsync(graphqlClient, projectId, hash);
    }
    else if (updateId) {
        return await getFingerprintInfoFromUpdateGroupIdOrUpdateIdAsync(graphqlClient, projectId, nonInteractive, updateId);
    }
    else if (buildId) {
        return await getFingerprintInfoFromBuildIdAsync(graphqlClient, buildId);
    }
    else if (useProjectFingerprint) {
        if (!firstFingerprintInfo) {
            throw new Error('First fingerprint must be provided in order to compare against the project.');
        }
        return await getFingerprintInfoFromLocalProjectAsync({
            graphqlClient,
            projectDir,
            projectId,
            vcsClient,
            getServerSideEnvironmentVariablesAsync,
            firstFingerprintInfo,
            environment: environmentForProjectFingerprint,
        });
    }
    if (nonInteractive) {
        throw new Error('Insufficent arguments provided for fingerprint comparison in non-interactive mode');
    }
    return await getFingerprintInfoInteractiveAsync({
        graphqlClient,
        projectDir,
        projectId,
        vcsClient,
        getServerSideEnvironmentVariablesAsync,
        firstFingerprintInfo,
        environmentForProjectFingerprint,
    });
}
async function getFingerprintInfoInteractiveAsync({ graphqlClient, projectDir, projectId, vcsClient, getServerSideEnvironmentVariablesAsync, firstFingerprintInfo, environmentForProjectFingerprint, }) {
    const prompt = firstFingerprintInfo
        ? 'Select the second fingerprint to compare against'
        : 'Select a reference fingerprint for comparison';
    const originType = await (0, prompts_1.selectAsync)(prompt, [
        ...(firstFingerprintInfo
            ? [{ title: 'Current project fingerprint', value: FingerprintOriginType.Project }]
            : []),
        { title: 'Build fingerprint', value: FingerprintOriginType.Build },
        { title: 'Update fingerprint', value: FingerprintOriginType.Update },
        { title: 'Enter a fingerprint hash manually', value: FingerprintOriginType.Hash },
    ]);
    if (originType === FingerprintOriginType.Project) {
        if (!firstFingerprintInfo) {
            throw new Error('First fingerprint must be provided in order to compare against the project.');
        }
        return await getFingerprintInfoFromLocalProjectAsync({
            graphqlClient,
            projectDir,
            projectId,
            vcsClient,
            getServerSideEnvironmentVariablesAsync,
            firstFingerprintInfo,
            environment: environmentForProjectFingerprint,
        });
    }
    else if (originType === FingerprintOriginType.Build) {
        const displayName = await (0, projectUtils_1.getDisplayNameForProjectIdAsync)(graphqlClient, projectId);
        const buildId = await selectBuildToCompareAsync(graphqlClient, projectId, displayName, {
            filters: { hasFingerprint: true },
        });
        if (!buildId) {
            throw new Error('Must select build with fingerprint for comparison.');
        }
        return await getFingerprintInfoFromBuildIdAsync(graphqlClient, buildId);
    }
    else if (originType === FingerprintOriginType.Update) {
        const selectedBranch = await (0, queries_1.selectBranchOnAppAsync)(graphqlClient, {
            projectId,
            promptTitle: 'On which branch would you like search for an update?',
            displayTextForListItem: updateBranch => ({
                title: updateBranch.name,
            }),
            paginatedQueryOptions: {
                json: false,
                nonInteractive: false,
                offset: 0,
            },
        });
        const selectedUpdateGroup = await (0, queries_2.selectUpdateGroupOnBranchAsync)(graphqlClient, {
            projectId,
            branchName: selectedBranch.name,
            paginatedQueryOptions: {
                json: false,
                nonInteractive: false,
                offset: 0,
            },
        });
        const updateGroupId = selectedUpdateGroup[0].group;
        return await getFingerprintInfoFromUpdateGroupIdOrUpdateIdAsync(graphqlClient, projectId, false, updateGroupId);
    }
    else if (originType === FingerprintOriginType.Hash) {
        const { hash } = await (0, prompts_1.promptAsync)({
            type: 'text',
            name: 'hash',
            message: 'Provide the fingerprint hash',
            validate: (value) => !!value.trim(),
            hint: '0000000000000000000000000000000000000000',
        });
        return await getFingerprintInfoFromHashAsync(graphqlClient, projectId, hash);
    }
    else {
        throw new Error(`Unsupported fingerprint origin type: ${originType}`);
    }
}
async function getFingerprintInfoFromLocalProjectAsync({ graphqlClient, projectDir, projectId, vcsClient, getServerSideEnvironmentVariablesAsync, firstFingerprintInfo, environment, }) {
    const firstFingerprintPlatforms = firstFingerprintInfo.platforms;
    if (!firstFingerprintPlatforms || firstFingerprintPlatforms.length === 0) {
        throw new Error(`Cannot compare the local directory against the provided fingerprint hash "${firstFingerprintInfo.fingerprint.hash}" because the associated platform could not be determined. Ensure the fingerprint is linked to a build or update to identify the platform.`);
    }
    if (environment) {
        log_1.default.log(`🔧 Using environment: ${environment}`);
    }
    const env = environment
        ? { ...(await getServerSideEnvironmentVariablesAsync()), EXPO_NO_DOTENV: '1' }
        : undefined;
    const fingerprint = await (0, utils_1.getFingerprintInfoFromLocalProjectForPlatformsAsync)(graphqlClient, projectDir, projectId, vcsClient, firstFingerprintPlatforms, { env });
    return { fingerprint, origin: { type: FingerprintOriginType.Project } };
}
async function getFingerprintFromUpdateFragmentAsync(updateWithFingerprint) {
    if (!updateWithFingerprint.fingerprint) {
        throw new Error(`Fingerprint for update ${updateWithFingerprint.id} was not computed.`);
    }
    else if (!updateWithFingerprint.fingerprint.debugInfoUrl) {
        throw new Error(`Fingerprint source for update ${updateWithFingerprint.id} was not computed.`);
    }
    return {
        fingerprint: await getFingerprintFromFingerprintFragmentAsync(updateWithFingerprint.fingerprint),
        platforms: [(0, utils_1.stringToAppPlatform)(updateWithFingerprint.platform)],
        origin: {
            type: FingerprintOriginType.Update,
            update: updateWithFingerprint,
        },
    };
}
async function getFingerprintInfoFromHashAsync(graphqlClient, projectId, hash) {
    const fingerprintFragment = await getFingerprintFragmentFromHashAsync(graphqlClient, projectId, hash);
    const fingerprint = await getFingerprintFromFingerprintFragmentAsync(fingerprintFragment);
    let platforms;
    const fingerprintBuilds = fingerprintFragment.builds?.edges.map(edge => edge.node) ?? [];
    const fingerprintUpdates = fingerprintFragment.updates?.edges.map(edge => edge.node) ?? [];
    if (fingerprintBuilds.length > 0) {
        platforms = [fingerprintBuilds[0].platform];
    }
    else if (fingerprintUpdates.length > 0) {
        platforms = [(0, utils_1.stringToAppPlatform)(fingerprintUpdates[0].platform)];
    }
    return {
        fingerprint,
        platforms,
        origin: {
            type: FingerprintOriginType.Hash,
        },
    };
}
async function getFingerprintInfoFromUpdateGroupIdOrUpdateIdAsync(graphqlClient, projectId, nonInteractive, updateGroupIdOrUpdateId) {
    // Some people may pass in update group id instead of update id, so add interactive support for that
    try {
        const maybeUpdateGroupId = updateGroupIdOrUpdateId;
        const updateGroup = await UpdateQuery_1.UpdateQuery.viewUpdateGroupAsync(graphqlClient, {
            groupId: maybeUpdateGroupId,
        });
        if (updateGroup.length === 1) {
            const update = updateGroup[0];
            return await getFingerprintFromUpdateFragmentAsync(update);
        }
        if (nonInteractive) {
            const project = await AppQuery_1.AppQuery.byIdAsync(graphqlClient, projectId);
            const updateUrl = (0, api_1.getExpoWebsiteBaseUrl)() +
                `/accounts/${project.ownerAccount.name}/projects/${project.slug}/updates/${maybeUpdateGroupId}`;
            throw new Error(`Please pass in your update ID from ${updateUrl} or use interactive mode to select the update ID.`);
        }
        const update = await (0, prompts_1.selectAsync)('Select a platform to compute the fingerprint from', updateGroup.map(update => ({
            title: update.platform,
            value: update,
        })));
        return await getFingerprintFromUpdateFragmentAsync(update);
    }
    catch (error) {
        if (!error?.message.includes('Could not find any updates with group ID')) {
            throw error;
        }
    }
    const updateId = updateGroupIdOrUpdateId;
    const updateWithFingerprint = await UpdateQuery_1.UpdateQuery.viewByUpdateAsync(graphqlClient, {
        updateId,
    });
    return await getFingerprintFromUpdateFragmentAsync(updateWithFingerprint);
}
async function getFingerprintInfoFromBuildIdAsync(graphqlClient, buildId) {
    const buildWithFingerprint = await BuildQuery_1.BuildQuery.withFingerprintByIdAsync(graphqlClient, buildId);
    if (!buildWithFingerprint.fingerprint) {
        throw new Error(`Fingerprint for build ${buildId} was not computed.`);
    }
    else if (!buildWithFingerprint.fingerprint.debugInfoUrl) {
        throw new Error(`Fingerprint source for build ${buildId} was not computed.`);
    }
    return {
        fingerprint: await getFingerprintFromFingerprintFragmentAsync(buildWithFingerprint.fingerprint),
        platforms: [buildWithFingerprint.platform],
        origin: {
            type: FingerprintOriginType.Build,
            build: buildWithFingerprint,
        },
    };
}
async function getFingerprintFragmentFromHashAsync(graphqlClient, projectId, hash) {
    const fingerprint = await FingerprintQuery_1.FingerprintQuery.byHashAsync(graphqlClient, {
        appId: projectId,
        hash,
    });
    if (!fingerprint) {
        const displayName = await (0, projectUtils_1.getDisplayNameForProjectIdAsync)(graphqlClient, projectId);
        throw new Error(`Fingerprint with hash ${hash} was not uploaded for ${displayName}.`);
    }
    return fingerprint;
}
async function getFingerprintFromFingerprintFragmentAsync(fingerprintFragment) {
    const fingerprintDebugUrl = fingerprintFragment.debugInfoUrl;
    if (!fingerprintDebugUrl) {
        throw new Error(`The source for fingerprint hash ${fingerprintFragment.hash} was not computed.`);
    }
    const fingerprintResponse = await fetch(fingerprintDebugUrl);
    return (await fingerprintResponse.json());
}
function printContentDiff(diff) {
    if (diff.op === 'added') {
        const sourceType = diff.addedSource.type;
        if (sourceType === 'contents') {
            printContentSource({
                op: diff.op,
                sourceType,
                contentsId: diff.addedSource.id,
                contentsAfter: diff.addedSource.contents,
            });
        }
    }
    else if (diff.op === 'removed') {
        const sourceType = diff.removedSource.type;
        if (sourceType === 'contents') {
            printContentSource({
                op: diff.op,
                sourceType,
                contentsId: diff.removedSource.id,
                contentsBefore: diff.removedSource.contents,
            });
        }
    }
    else if (diff.op === 'changed') {
        const sourceType = diff.beforeSource.type;
        if (sourceType === 'contents') {
            if (diff.afterSource.type !== 'contents') {
                throw new Error(`Changed fingerprint source types must be the same, received ${diff.beforeSource.type}, ${diff.afterSource.type}`);
            }
            printContentSource({
                op: diff.op,
                sourceType: diff.beforeSource.type, // before and after source types should be the same
                contentsId: diff.beforeSource.id, // before and after content ids should be the same
                contentsBefore: diff.beforeSource.contents,
                contentsAfter: diff.afterSource.contents,
            });
        }
    }
}
function getDiffFilePathFields(diff) {
    if (diff.op === 'added') {
        const sourceType = diff.addedSource.type;
        if (sourceType !== 'contents') {
            return getFilePathSourceFields({
                op: diff.op,
                sourceType,
                filePath: diff.addedSource.filePath,
            });
        }
    }
    else if (diff.op === 'removed') {
        const sourceType = diff.removedSource.type;
        if (sourceType !== 'contents') {
            return getFilePathSourceFields({
                op: diff.op,
                sourceType,
                filePath: diff.removedSource.filePath,
            });
        }
    }
    else if (diff.op === 'changed') {
        const sourceType = diff.beforeSource.type;
        if (sourceType !== 'contents') {
            return getFilePathSourceFields({
                op: diff.op,
                sourceType: diff.beforeSource.type, // before and after source types should be the same
                filePath: diff.beforeSource.filePath, // before and after filePaths should be the same
            });
        }
    }
    return null;
}
function getFilePathSourceFields({ op, sourceType, filePath, }) {
    if (sourceType === 'dir') {
        if (op === 'added') {
            return { label: 'new directory', value: filePath };
        }
        else if (op === 'removed') {
            return { label: 'removed directory', value: filePath };
        }
        else if (op === 'changed') {
            return { label: 'modified directory', value: filePath };
        }
    }
    else if (sourceType === 'file') {
        if (op === 'added') {
            return { label: 'new file', value: filePath };
        }
        else if (op === 'removed') {
            return { label: 'removed file', value: filePath };
        }
        else if (op === 'changed') {
            return { label: 'modified file', value: filePath };
        }
    }
    throw new Error(`Unsupported source and op: ${sourceType}, ${op}`);
}
const PRETTY_CONTENT_ID = {
    'expoAutolinkingConfig:ios': 'Expo autolinking config (iOS)',
    'expoAutolinkingConfig:android': 'Expo autolinking config (Android)',
    'packageJson:scripts': 'package.json scripts',
    expoConfig: 'Expo app config',
    'package:react-native': 'React Native package.json',
    'rncoreAutolinkingConfig:ios': 'React Native Community autolinking config (iOS)',
    'rncoreAutolinkingConfig:android': 'React Native Community autolinking config (Android)',
};
function printContentSource({ op, contentsBefore, contentsAfter, contentsId, }) {
    log_1.default.newLine();
    const prettyContentId = PRETTY_CONTENT_ID[contentsId] ?? contentsId;
    if (op === 'added') {
        log_1.default.log(`${chalk_1.default.dim('📝 New content')}: ${prettyContentId}`);
    }
    else if (op === 'removed') {
        log_1.default.log(`${chalk_1.default.dim('📝 Removed content')}: ${prettyContentId}`);
    }
    else if (op === 'changed') {
        log_1.default.log(`${chalk_1.default.dim('📝 Modified content')}: ${prettyContentId}`);
    }
    printContentsDiff(contentsBefore ?? '', contentsAfter ?? '');
}
function printContentsDiff(contents1, contents2) {
    const stringifiedContents1 = Buffer.isBuffer(contents1) ? contents1.toString() : contents1;
    const stringifiedContents2 = Buffer.isBuffer(contents2) ? contents2.toString() : contents2;
    const isStr1JSON = isJSON(stringifiedContents1);
    const isStr2JSON = isJSON(stringifiedContents2);
    const prettifiedContents1 = isStr1JSON
        ? JSON.stringify(JSON.parse(stringifiedContents1), null, 2)
        : stringifiedContents1;
    const prettifiedContents2 = isStr2JSON
        ? JSON.stringify(JSON.parse(stringifiedContents2), null, 2)
        : stringifiedContents2;
    (0, diff_1.abridgedDiff)(prettifiedContents1, prettifiedContents2, 0);
}
function prettyPrintFingerprint(fingerprint, origin) {
    if (origin.type === FingerprintOriginType.Project) {
        return `fingerprint ${fingerprint.hash} from local directory`;
    }
    else if (origin.type === FingerprintOriginType.Update) {
        return `fingerprint ${fingerprint.hash} from ${origin.update?.platform ? (0, utils_1.stringToAppPlatform)(origin.update?.platform) : ''} ${origin.type}`;
    }
    else if (origin.type === FingerprintOriginType.Build) {
        return `fingerprint ${fingerprint.hash} from ${origin.build?.platform} ${origin.type}`;
    }
    return `fingerprint ${fingerprint.hash}`;
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function isJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}
async function selectBuildToCompareAsync(graphqlClient, projectId, projectDisplayName, { filters, } = {}) {
    const spinner = (0, ora_1.ora)().start('Fetching builds…');
    let builds;
    try {
        builds = await (0, builds_1.fetchBuildsAsync)({ graphqlClient, projectId, filters });
        spinner.stop();
    }
    catch (error) {
        spinner.fail(`Something went wrong and we couldn't fetch the builds for the project ${projectDisplayName}.`);
        throw error;
    }
    if (builds.length === 0) {
        log_1.default.warn(`No fingerprints have been computed for builds of project ${projectDisplayName}.`);
        return null;
    }
    else {
        const build = await (0, prompts_1.selectAsync)('Which build do you want to compare?', builds.map(build => ({
            title: (0, builds_1.formatBuild)(build),
            value: build.id,
        })));
        return build;
    }
}
