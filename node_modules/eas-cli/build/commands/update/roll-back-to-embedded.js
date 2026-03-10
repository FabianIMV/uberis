"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const eas_json_1 = require("@expo/eas-json");
const core_1 = require("@oclif/core");
const queries_1 = require("../../branch/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const pagination_1 = require("../../commandUtils/pagination");
const generated_1 = require("../../graphql/generated");
const projectUtils_1 = require("../../project/projectUtils");
const publish_1 = require("../../project/publish");
const configure_1 = require("../../update/configure");
const queries_2 = require("../../update/queries");
const roll_back_to_embedded_1 = require("../../update/roll-back-to-embedded");
const code_signing_1 = require("../../utils/code-signing");
const json_1 = require("../../utils/json");
const statuspageService_1 = require("../../utils/statuspageService");
class UpdateRollBackToEmbedded extends EasCommand_1.default {
    static description = 'roll back to the embedded update';
    static flags = {
        branch: core_1.Flags.string({
            description: 'Branch to publish the rollback to embedded update group on',
            required: false,
        }),
        channel: core_1.Flags.string({
            description: 'Channel that the published rollback to embedded update should affect',
            required: false,
        }),
        'runtime-version': core_1.Flags.string({
            description: 'Runtime version that the rollback to embedded update should target',
            required: false,
        }),
        message: core_1.Flags.string({
            description: 'A short message describing the rollback to embedded update',
            required: false,
        }),
        platform: core_1.Flags.option({
            char: 'p',
            options: [
                // TODO: Add web when it's fully supported
                ...publish_1.defaultPublishPlatforms,
                'all',
            ],
            default: 'all',
            required: false,
        })(),
        'private-key-path': core_1.Flags.string({
            description: `File containing the PEM-encoded private key corresponding to the certificate in expo-updates' configuration. Defaults to a file named "private-key.pem" in the certificate's directory. Only relevant if you are using code signing: https://docs.expo.dev/eas-update/code-signing/`,
            required: false,
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        const { flags: rawFlags } = await this.parse(UpdateRollBackToEmbedded);
        const paginatedQueryOptions = (0, pagination_1.getPaginatedQueryOptions)(rawFlags);
        const { platform: platformFlag, channelName: channelNameArg, updateMessage: updateMessageArg, runtimeVersion: runtimeVersionArg, privateKeyPath, json: jsonFlag, nonInteractive, branchName: branchNameArg, } = this.sanitizeFlags(rawFlags);
        const { getDynamicPublicProjectConfigAsync, getDynamicPrivateProjectConfigAsync, loggedIn: { graphqlClient }, vcsClient, } = await this.getContextAsync(UpdateRollBackToEmbedded, {
            nonInteractive,
            withServerSideEnvironment: null,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        const { exp: expPossiblyWithoutEasUpdateConfigured, projectId, projectDir, } = await getDynamicPublicProjectConfigAsync();
        await (0, statuspageService_1.maybeWarnAboutEasOutagesAsync)(graphqlClient, [generated_1.StatuspageServiceName.EasUpdate]);
        const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
        const easJsonCliConfig = (await eas_json_1.EasJsonUtils.getCliConfigAsync(easJsonAccessor)) ?? {};
        await (0, configure_1.ensureEASUpdateIsConfiguredAsync)({
            exp: expPossiblyWithoutEasUpdateConfigured,
            platform: platformFlag,
            projectDir,
            projectId,
            vcsClient,
            env: undefined,
            manifestHostOverride: easJsonCliConfig.updateManifestHostOverride ?? null,
        });
        // check that the expo-updates package version supports roll back to embedded
        await (0, projectUtils_1.enforceRollBackToEmbeddedUpdateSupportAsync)(projectDir);
        const { exp } = await getDynamicPublicProjectConfigAsync();
        const { exp: expPrivate } = await getDynamicPrivateProjectConfigAsync();
        const codeSigningInfo = await (0, code_signing_1.getCodeSigningInfoAsync)(expPrivate, privateKeyPath);
        const branchName = await (0, publish_1.getBranchNameForCommandAsync)({
            graphqlClient,
            vcsClient,
            projectId,
            channelNameArg,
            branchNameArg,
            autoFlag: false,
            nonInteractive,
            paginatedQueryOptions,
        });
        const updateMessage = await (0, publish_1.getUpdateMessageForCommandAsync)(vcsClient, {
            updateMessageArg,
            autoFlag: false,
            nonInteractive,
            jsonFlag,
        });
        const realizedPlatforms = platformFlag === 'all' ? publish_1.defaultPublishPlatforms : [platformFlag];
        const { branch } = await (0, queries_1.ensureBranchExistsAsync)(graphqlClient, {
            appId: projectId,
            branchName,
        });
        const selectedRuntime = runtimeVersionArg ??
            (await (0, queries_2.selectRuntimeOnBranchAsync)(graphqlClient, {
                appId: projectId,
                branchName,
            }))?.version;
        if (!selectedRuntime) {
            core_1.Errors.error('Must select a runtime or provide the --runtimeVersion flag', { exit: 1 });
        }
        await (0, roll_back_to_embedded_1.publishRollBackToEmbeddedUpdateAsync)({
            graphqlClient,
            projectId,
            exp,
            updateMessage,
            branch,
            codeSigningInfo,
            platforms: realizedPlatforms,
            runtimeVersion: selectedRuntime,
            json: jsonFlag,
        });
    }
    sanitizeFlags(flags) {
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { branch: branchName, channel: channelName, message: updateMessage, 'runtime-version': runtimeVersion, } = flags;
        if (nonInteractive && !(updateMessage && (branchName || channelName))) {
            core_1.Errors.error('--branch and --message, or --channel and --message are required in non-interactive mode', { exit: 1 });
        }
        if (nonInteractive && !runtimeVersion) {
            core_1.Errors.error('--runtimeVersion is required in non-interactive mode', { exit: 1 });
        }
        return {
            branchName,
            channelName,
            updateMessage,
            runtimeVersion,
            platform: flags.platform,
            privateKeyPath: flags['private-key-path'],
            nonInteractive,
            json,
        };
    }
}
exports.default = UpdateRollBackToEmbedded;
