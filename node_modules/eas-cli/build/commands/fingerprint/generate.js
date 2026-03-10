"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const eas_json_1 = require("@expo/eas-json");
const core_1 = require("@oclif/core");
const api_1 = require("../../api");
const evaluateConfigWithEnvVarsAsync_1 = require("../../build/evaluateConfigWithEnvVarsAsync");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const utils_1 = require("../../fingerprint/utils");
const generated_1 = require("../../graphql/generated");
const AppQuery_1 = require("../../graphql/queries/AppQuery");
const log_1 = tslib_1.__importStar(require("../../log"));
const prompts_1 = require("../../prompts");
const json_1 = require("../../utils/json");
const profiles_1 = require("../../utils/profiles");
class FingerprintGenerate extends EasCommand_1.default {
    static description = 'generate fingerprints from the current project';
    static strict = false;
    static examples = [
        '$ eas fingerprint:generate  \t # Generate fingerprint in interactive mode',
        '$ eas fingerprint:generate --build-profile preview  \t # Generate a fingerprint using the "preview" build profile',
        '$ eas fingerprint:generate --environment preview  \t # Generate a fingerprint using the "preview" environment',
        '$ eas fingerprint:generate --json --non-interactive --platform android  \t # Output fingerprint json to stdout',
    ];
    static flags = {
        platform: core_1.Flags.option({
            char: 'p',
            options: ['android', 'ios'],
        })(),
        ...flags_1.EASEnvironmentFlag,
        environment: core_1.Flags.string({
            ...flags_1.EasEnvironmentFlagParameters,
            exclusive: ['build-profile'],
        }),
        'build-profile': core_1.Flags.string({
            char: 'e',
            description: 'Name of the build profile from eas.json.',
            exclusive: ['environment'],
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.ProjectConfig,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Vcs,
        ...this.ContextOptions.ServerSideEnvironmentVariables,
        ...this.ContextOptions.DynamicProjectConfig,
    };
    async runAsync() {
        const { flags } = await this.parse(FingerprintGenerate);
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { platform: platformStringFlag, environment, 'build-profile': buildProfileName } = flags;
        const { projectId, privateProjectConfig: { projectDir }, loggedIn: { graphqlClient }, vcsClient, getServerSideEnvironmentVariablesAsync, getDynamicPrivateProjectConfigAsync, } = await this.getContextAsync(FingerprintGenerate, {
            nonInteractive,
            withServerSideEnvironment: environment ?? null,
        });
        if (json) {
            (0, json_1.enableJsonOutput)();
        }
        let platform;
        if (platformStringFlag) {
            platform = (0, utils_1.stringToAppPlatform)(platformStringFlag);
        }
        else {
            if (nonInteractive) {
                throw new Error('Platform must be specified in non-interactive mode with the --p flag');
            }
            platform = await selectRequestedPlatformAsync();
        }
        let env = undefined;
        if (environment) {
            log_1.default.log(`🔧 Using environment: ${environment}`);
            env = { ...(await getServerSideEnvironmentVariablesAsync()), EXPO_NO_DOTENV: '1' };
        }
        else if (buildProfileName) {
            log_1.default.log(`🔧 Using build profile: ${buildProfileName}`);
            const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
            const buildProfile = (await (0, profiles_1.getProfilesAsync)({
                type: 'build',
                easJsonAccessor,
                platforms: [(0, utils_1.appPlatformToPlatform)(platform)],
                profileName: buildProfileName ?? undefined,
                projectDir,
            }))[0];
            if (!buildProfile) {
                throw new Error(`Build profile ${buildProfile} not found for platform: ${platform}`);
            }
            const configResult = await (0, evaluateConfigWithEnvVarsAsync_1.evaluateConfigWithEnvVarsAsync)({
                buildProfile: buildProfile.profile,
                buildProfileName: buildProfile.profileName,
                graphqlClient,
                getProjectConfig: getDynamicPrivateProjectConfigAsync,
                opts: { env: buildProfile.profile.env },
            });
            env = configResult.env;
        }
        const fingerprint = await (0, utils_1.getFingerprintInfoFromLocalProjectForPlatformsAsync)(graphqlClient, projectDir, projectId, vcsClient, [platform], { env });
        if (json) {
            (0, json_1.printJsonOnlyOutput)(fingerprint);
            return;
        }
        log_1.default.log(`✅ Fingerprint generated: ${fingerprint.hash}`);
        const project = await AppQuery_1.AppQuery.byIdAsync(graphqlClient, projectId);
        const fingerprintUrl = new URL(`/accounts/${project.ownerAccount.name}/projects/${project.slug}/fingerprints/${fingerprint.hash}`, (0, api_1.getExpoWebsiteBaseUrl)());
        log_1.default.log(`🔍 View the fingerprint at ${(0, log_1.link)(fingerprintUrl.toString())}`);
        log_1.default.log(`💡 If you want to see the entire fingerprint output, pass in the --json flag.`);
    }
}
exports.default = FingerprintGenerate;
async function selectRequestedPlatformAsync() {
    const { requestedPlatform } = await (0, prompts_1.promptAsync)({
        type: 'select',
        message: 'Select platform',
        name: 'requestedPlatform',
        choices: [
            { title: 'Android', value: generated_1.AppPlatform.Android },
            { title: 'iOS', value: generated_1.AppPlatform.Ios },
        ],
    });
    return requestedPlatform;
}
