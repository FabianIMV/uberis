"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const eas_build_job_1 = require("@expo/eas-build-job");
const eas_json_1 = require("@expo/eas-json");
const core_1 = require("@oclif/core");
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const generated_1 = require("../../graphql/generated");
const AppStoreConnectApiKeyQuery_1 = require("../../graphql/queries/AppStoreConnectApiKeyQuery");
const GoogleServiceAccountKeyQuery_1 = require("../../graphql/queries/GoogleServiceAccountKeyQuery");
const AndroidSubmitCommand_1 = tslib_1.__importDefault(require("../../submit/android/AndroidSubmitCommand"));
const context_1 = require("../../submit/context");
const IosSubmitCommand_1 = tslib_1.__importDefault(require("../../submit/ios/IosSubmitCommand"));
const json_1 = require("../../utils/json");
const git_1 = tslib_1.__importDefault(require("../../vcs/clients/git"));
/**
 * This command will be run on the EAS workers.
 * This command resolves credentials and other
 * configuration, that normally would be included in the
 * job and metadata objects, and prints them to stdout.
 */
class SubmitInternal extends EasCommand_1.default {
    static hidden = true;
    static flags = {
        platform: core_1.Flags.option({
            options: [eas_build_job_1.Platform.ANDROID, eas_build_job_1.Platform.IOS],
            required: true,
        })(),
        profile: core_1.Flags.string({
            description: 'Name of the submit profile from eas.json. Defaults to "production" if defined in eas.json.',
        }),
        id: core_1.Flags.string({
            description: 'ID of the build to submit',
            required: true,
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.ProjectConfig,
        ...this.ContextOptions.ProjectDir,
        ...this.ContextOptions.Analytics,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        const { flags } = await this.parse(SubmitInternal);
        // This command is always run with implicit --non-interactive and --json options
        (0, json_1.enableJsonOutput)();
        const { loggedIn: { actor, graphqlClient }, privateProjectConfig: { exp, projectId, projectDir }, analytics, vcsClient, } = await this.getContextAsync(SubmitInternal, {
            nonInteractive: true,
            withServerSideEnvironment: null,
        });
        if (vcsClient instanceof git_1.default) {
            // `build:internal` is run on EAS workers and the repo may have been changed
            // by pre-install hooks or other scripts. We don't want to require committing changes
            // to continue the build.
            vcsClient.requireCommit = false;
        }
        const submissionProfile = await eas_json_1.EasJsonUtils.getSubmitProfileAsync(eas_json_1.EasJsonAccessor.fromProjectPath(projectDir), flags.platform, flags.profile);
        const ctx = await (0, context_1.createSubmissionContextAsync)({
            platform: flags.platform,
            projectDir,
            profile: submissionProfile,
            archiveFlags: {
                id: flags.id,
            },
            nonInteractive: true,
            isVerboseFastlaneEnabled: false,
            actor,
            graphqlClient,
            analytics,
            exp,
            projectId,
            vcsClient,
            specifiedProfile: flags.profile,
            groups: undefined, // use groups from submit profile
        });
        let config;
        if (ctx.platform === eas_build_job_1.Platform.IOS) {
            const command = new IosSubmitCommand_1.default(ctx);
            const submitter = await command.runAsync();
            const mutationInput = await submitter.getSubmissionInputAsync();
            const iosConfig = mutationInput.submissionConfig;
            const ascApiKeyJson = await getAppStoreConnectApiKeyJsonAsync({
                iosConfig,
                graphqlClient,
            });
            const configInput = {
                ascAppIdentifier: iosConfig.ascAppIdentifier,
                isVerboseFastlaneEnabled: iosConfig.isVerboseFastlaneEnabled ?? undefined,
                groups: iosConfig.groups ?? undefined,
                ...(ascApiKeyJson
                    ? { ascApiJsonKey: ascApiKeyJson }
                    : {
                        appleIdUsername: (0, nullthrows_1.default)(iosConfig.appleIdUsername),
                        appleAppSpecificPassword: (0, nullthrows_1.default)(iosConfig.appleAppSpecificPassword),
                    }),
            };
            config = eas_build_job_1.SubmissionConfig.Ios.SchemaZ.parse(configInput);
        }
        else if (ctx.platform === eas_build_job_1.Platform.ANDROID) {
            const command = new AndroidSubmitCommand_1.default(ctx);
            const submitter = await command.runAsync();
            const mutationInput = await submitter.getSubmissionInputAsync();
            const androidConfig = mutationInput.submissionConfig;
            const changesNotSentForReview = androidConfig.changesNotSentForReview ?? undefined;
            const releaseStatus = androidConfig.releaseStatus
                ? graphQlReleaseStatusToConfigReleaseStatus[androidConfig.releaseStatus]
                : undefined;
            const googleServiceAccountKeyJson = (0, nullthrows_1.default)(await getGoogleServiceAccountKeyJsonAsync({
                androidConfig,
                graphqlClient,
            }));
            const configInput = {
                changesNotSentForReview,
                googleServiceAccountKeyJson,
                track: androidConfig.track,
                ...(releaseStatus === eas_build_job_1.SubmissionConfig.Android.ReleaseStatus.IN_PROGRESS
                    ? {
                        releaseStatus: eas_build_job_1.SubmissionConfig.Android.ReleaseStatus.IN_PROGRESS,
                        rollout: androidConfig.rollout ?? undefined,
                    }
                    : { releaseStatus }),
            };
            config = eas_build_job_1.SubmissionConfig.Android.SchemaZ.parse(configInput);
        }
        else {
            throw new Error(`Unsupported platform: ${ctx.platform}`);
        }
        (0, json_1.printJsonOnlyOutput)({ config });
    }
}
exports.default = SubmitInternal;
async function getGoogleServiceAccountKeyJsonAsync({ androidConfig, graphqlClient, }) {
    if (androidConfig.googleServiceAccountKeyJson) {
        return androidConfig.googleServiceAccountKeyJson;
    }
    else if (androidConfig.googleServiceAccountKeyId) {
        const key = await GoogleServiceAccountKeyQuery_1.GoogleServiceAccountKeyQuery.getByIdAsync(graphqlClient, androidConfig.googleServiceAccountKeyId);
        return key.keyJson;
    }
    return null;
}
async function getAppStoreConnectApiKeyJsonAsync({ iosConfig, graphqlClient, }) {
    if (iosConfig.ascApiKey) {
        return JSON.stringify({
            key_id: iosConfig.ascApiKey.keyIdentifier,
            issuer_id: iosConfig.ascApiKey.issuerIdentifier,
            key: iosConfig.ascApiKey.keyP8,
        });
    }
    else if (iosConfig.ascApiKeyId) {
        const key = await AppStoreConnectApiKeyQuery_1.AppStoreConnectApiKeyQuery.getByIdAsync(graphqlClient, iosConfig.ascApiKeyId);
        return JSON.stringify({
            key_id: key.keyIdentifier,
            issuer_id: key.issuerIdentifier,
            key: key.keyP8,
        });
    }
    return null;
}
const graphQlReleaseStatusToConfigReleaseStatus = {
    [generated_1.SubmissionAndroidReleaseStatus.Draft]: eas_build_job_1.SubmissionConfig.Android.ReleaseStatus.DRAFT,
    [generated_1.SubmissionAndroidReleaseStatus.InProgress]: eas_build_job_1.SubmissionConfig.Android.ReleaseStatus.IN_PROGRESS,
    [generated_1.SubmissionAndroidReleaseStatus.Completed]: eas_build_job_1.SubmissionConfig.Android.ReleaseStatus.COMPLETED,
    [generated_1.SubmissionAndroidReleaseStatus.Halted]: eas_build_job_1.SubmissionConfig.Android.ReleaseStatus.HALTED,
};
