"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndroidContextAsync = createAndroidContextAsync;
exports.prepareAndroidBuildAsync = prepareAndroidBuildAsync;
exports.maybeWarnAboutNonStandardBuildType = maybeWarnAboutNonStandardBuildType;
const tslib_1 = require("tslib");
const eas_build_job_1 = require("@expo/eas-build-job");
const eas_json_1 = require("@expo/eas-json");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const getenv_1 = tslib_1.__importDefault(require("getenv"));
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const graphql_1 = require("./graphql");
const prepareJob_1 = require("./prepareJob");
const syncProjectConfiguration_1 = require("./syncProjectConfiguration");
const version_1 = require("./version");
const AndroidCredentialsProvider_1 = tslib_1.__importDefault(require("../../credentials/android/AndroidCredentialsProvider"));
const BuildMutation_1 = require("../../graphql/mutations/BuildMutation");
const log_1 = tslib_1.__importStar(require("../../log"));
const applicationId_1 = require("../../project/android/applicationId");
const gradle_1 = require("../../project/android/gradle");
const prompts_1 = require("../../prompts");
const build_1 = require("../build");
const credentials_1 = require("../utils/credentials");
const validate_1 = require("../validate");
async function createAndroidContextAsync(ctx) {
    const { buildProfile } = ctx;
    if (buildProfile.distribution === 'internal' && buildProfile.gradleCommand?.match(/bundle/)) {
        log_1.default.addNewLineIfNone();
        log_1.default.warn(`You're building your Android app for internal distribution. However, we've detected that the Gradle command you defined (${chalk_1.default.underline(buildProfile.gradleCommand)}) includes string 'bundle'.
This means that it will most likely produce an AAB and you will not be able to install it on your Android devices straight from the Expo website.`);
        log_1.default.newLine();
        const confirmed = await (0, prompts_1.toggleConfirmAsync)({ message: 'Would you like to proceed?' });
        if (!confirmed) {
            log_1.default.error('Update eas.json and come back again.');
            process.exit(1);
        }
    }
    (0, validate_1.checkNodeEnvVariable)(ctx);
    await (0, validate_1.checkGoogleServicesFileAsync)(ctx);
    await (0, validate_1.validatePNGsForManagedProjectAsync)(ctx);
    const gradleContext = await (0, gradle_1.resolveGradleBuildContextAsync)(ctx.projectDir, buildProfile, ctx.vcsClient);
    if (gradleContext?.buildType) {
        maybeWarnAboutNonStandardBuildType({ buildProfile, buildType: gradleContext.buildType });
    }
    if (ctx.workflow === eas_build_job_1.Workflow.MANAGED) {
        await (0, applicationId_1.ensureApplicationIdIsDefinedForManagedProjectAsync)(ctx);
    }
    const applicationId = await (0, applicationId_1.getApplicationIdAsync)(ctx.projectDir, ctx.exp, ctx.vcsClient, gradleContext);
    const versionCodeOverride = ctx.easJsonCliConfig?.appVersionSource === eas_json_1.AppVersionSource.REMOTE
        ? await (0, version_1.resolveRemoteVersionCodeAsync)(ctx.graphqlClient, {
            projectDir: ctx.projectDir,
            projectId: ctx.projectId,
            exp: ctx.exp,
            applicationId,
            buildProfile,
            vcsClient: ctx.vcsClient,
        })
        : undefined;
    return { applicationId, gradleContext, versionCodeOverride };
}
async function prepareAndroidBuildAsync(ctx) {
    return await (0, build_1.prepareBuildRequestForPlatformAsync)({
        ctx,
        ensureCredentialsAsync: async (ctx) => {
            return await ensureAndroidCredentialsAsync(ctx);
        },
        syncProjectConfigurationAsync: async () => {
            await (0, syncProjectConfiguration_1.syncProjectConfigurationAsync)({
                projectDir: ctx.projectDir,
                exp: ctx.exp,
                localAutoIncrement: ctx.easJsonCliConfig?.appVersionSource === eas_json_1.AppVersionSource.REMOTE
                    ? false
                    : ctx.buildProfile.autoIncrement,
                vcsClient: ctx.vcsClient,
                env: ctx.env,
            });
        },
        prepareJobAsync: async (ctx, jobData) => {
            return await (0, prepareJob_1.prepareJobAsync)(ctx, jobData);
        },
        sendBuildRequestAsync: async (appId, job, graphqlMetadata, buildParams) => {
            const graphqlJob = (0, graphql_1.transformJob)(job);
            return await BuildMutation_1.BuildMutation.createAndroidBuildAsync(ctx.graphqlClient, {
                appId,
                job: graphqlJob,
                metadata: graphqlMetadata,
                buildParams,
            });
        },
    });
}
function shouldProvideCredentials(ctx) {
    return !ctx.buildProfile.withoutCredentials;
}
async function ensureAndroidCredentialsAsync(ctx) {
    if (!shouldProvideCredentials(ctx)) {
        return;
    }
    const androidApplicationIdentifier = await (0, applicationId_1.getApplicationIdAsync)(ctx.projectDir, ctx.exp, ctx.vcsClient, ctx.android.gradleContext);
    const provider = new AndroidCredentialsProvider_1.default(ctx.credentialsCtx, {
        name: ctx.buildProfile.keystoreName,
        app: {
            account: (0, nullthrows_1.default)(ctx.user.accounts.find(a => a.name === ctx.accountName), `You do not have access to account: ${ctx.accountName}`),
            projectName: ctx.projectName,
            androidApplicationIdentifier,
        },
    });
    const { credentialsSource } = ctx.buildProfile;
    (0, credentials_1.logCredentialsSource)(credentialsSource, eas_build_job_1.Platform.ANDROID);
    return {
        credentials: await provider.getCredentialsAsync(credentialsSource),
        source: credentialsSource,
    };
}
function maybeWarnAboutNonStandardBuildType({ buildProfile, buildType, }) {
    const shouldSuppressWarning = getenv_1.default.boolish('EAS_BUILD_NO_GRADLE_BUILD_TYPE_WARNING', false);
    if (shouldSuppressWarning) {
        return;
    }
    const knownValidBuildTypes = ['debug', 'release'];
    if (!knownValidBuildTypes.includes(buildType)) {
        log_1.default.warn(`Custom gradle command "${chalk_1.default.bold(buildProfile.gradleCommand)}" has non-standard build type: "${chalk_1.default.bold(buildType)}". Expected the command to end with "${chalk_1.default.bold('...Debug')}" or "${chalk_1.default.bold('...Release')}"`);
        log_1.default.warn(`Ensure the command is spelled correctly and ${chalk_1.default.bold('build.gradle')} is configured correctly. To suppress this warning, set ${chalk_1.default.bold('EAS_BUILD_NO_GRADLE_BUILD_TYPE_WARNING=true')}.`);
        log_1.default.warn((0, log_1.learnMore)('https://developer.android.com/build/build-variants#build-types'));
    }
}
