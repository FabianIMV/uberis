"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canCopyLegacyCredentialsAsync = canCopyLegacyCredentialsAsync;
exports.promptUserAndCopyLegacyCredentialsAsync = promptUserAndCopyLegacyCredentialsAsync;
exports.getAppLookupParamsFromContextAsync = getAppLookupParamsFromContextAsync;
exports.createOrUpdateDefaultAndroidAppBuildCredentialsAsync = createOrUpdateDefaultAndroidAppBuildCredentialsAsync;
exports.promptForNameAsync = promptForNameAsync;
exports.sortBuildCredentials = sortBuildCredentials;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const nanoid_1 = require("nanoid");
const ora_1 = require("../../../ora");
const applicationId_1 = require("../../../project/android/applicationId");
const projectUtils_1 = require("../../../project/projectUtils");
const prompts_1 = require("../../../prompts");
const errors_1 = require("../../errors");
/**
 * Legacy credentials can be copied over to EAS if the user does not have
 * EAS credentials set up yet
 */
async function canCopyLegacyCredentialsAsync(ctx, app) {
    const appCredentials = await ctx.android.getAndroidAppCredentialsWithCommonFieldsAsync(ctx.graphqlClient, app);
    if (appCredentials) {
        return false; // modern credentials already exist
    }
    const legacyAppCredentials = await ctx.android.getLegacyAndroidAppCredentialsWithCommonFieldsAsync(ctx.graphqlClient, app);
    return !!legacyAppCredentials; // user has some legacy credentials
}
async function promptUserAndCopyLegacyCredentialsAsync(ctx, app) {
    (0, assert_1.default)(await canCopyLegacyCredentialsAsync(ctx, app), 'User not eligible to copy classic build credentials to EAS');
    const spinner = (0, ora_1.ora)('Classic credentials detected, copying to EAS...').start();
    try {
        const legacyAppCredentials = await ctx.android.getLegacyAndroidAppCredentialsWithCommonFieldsAsync(ctx.graphqlClient, app);
        if (!legacyAppCredentials) {
            return;
        }
        const appCredentials = await ctx.android.createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync(ctx.graphqlClient, app);
        const legacyFcm = legacyAppCredentials.androidFcm;
        if (legacyFcm) {
            const clonedFcm = await ctx.android.createFcmAsync(ctx.graphqlClient, app.account, legacyFcm.credential, legacyFcm.version);
            await ctx.android.updateAndroidAppCredentialsAsync(ctx.graphqlClient, appCredentials, {
                androidFcmId: clonedFcm.id,
            });
        }
        const legacyBuildCredentials = await ctx.android.getLegacyAndroidAppBuildCredentialsAsync(ctx.graphqlClient, app);
        const legacyKeystore = legacyBuildCredentials?.androidKeystore ?? null;
        if (legacyKeystore) {
            const clonedKeystore = await ctx.android.createKeystoreAsync(ctx.graphqlClient, app.account, {
                keystore: legacyKeystore.keystore,
                keystorePassword: legacyKeystore.keystorePassword,
                keyAlias: legacyKeystore.keyAlias,
                keyPassword: legacyKeystore.keyPassword ?? undefined,
                type: legacyKeystore.type,
            });
            await createOrUpdateDefaultAndroidAppBuildCredentialsAsync(ctx, app, {
                androidKeystoreId: clonedKeystore.id,
            });
        }
    }
    catch (e) {
        spinner.fail(`Unable to migrate credentials to EAS.`);
        throw e;
    }
    spinner.succeed('Credentials copied to EAS.');
}
async function getAppLookupParamsFromContextAsync(ctx, gradleContext) {
    const exp = await ctx.getExpoConfigAsync();
    const projectName = exp.slug;
    const projectId = await ctx.getProjectIdAsync();
    const account = await (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(ctx.graphqlClient, projectId);
    const androidApplicationIdentifier = await (0, applicationId_1.getApplicationIdAsync)(ctx.projectDir, exp, ctx.vcsClient, gradleContext);
    if (!androidApplicationIdentifier) {
        throw new errors_1.AndroidPackageNotDefinedError(`android.package needs to be defined in your ${(0, projectUtils_1.getProjectConfigDescription)(ctx.projectDir)} file`);
    }
    return { account, projectName, androidApplicationIdentifier };
}
async function createOrUpdateDefaultAndroidAppBuildCredentialsAsync(ctx, appLookupParams, { androidKeystoreId, }) {
    const existingDefaultBuildCredentials = await ctx.android.getDefaultAndroidAppBuildCredentialsAsync(ctx.graphqlClient, appLookupParams);
    if (existingDefaultBuildCredentials) {
        return await ctx.android.updateAndroidAppBuildCredentialsAsync(ctx.graphqlClient, existingDefaultBuildCredentials, { androidKeystoreId });
    }
    return await ctx.android.createAndroidAppBuildCredentialsAsync(ctx.graphqlClient, appLookupParams, {
        name: generateRandomName(),
        isDefault: true,
        androidKeystoreId,
    });
}
async function promptForNameAsync() {
    const { providedName } = await (0, prompts_1.promptAsync)({
        type: 'text',
        name: 'providedName',
        message: 'Assign a name to your build credentials:',
        initial: generateRandomName(),
        validate: (input) => input !== '',
    });
    return providedName;
}
/**
 * sort a build credentials array in descending order of preference
 * prefer default credentials, then prefer names that come first lexicographically
 */
function sortBuildCredentials(androidAppBuildCredentialsList) {
    return androidAppBuildCredentialsList.sort((buildCredentialsA, buildCredentialsB) => {
        if (buildCredentialsA.isDefault) {
            return -1;
        }
        else if (buildCredentialsB.isDefault) {
            return 1;
        }
        return buildCredentialsA.name.localeCompare(buildCredentialsB.name);
    });
}
function generateRandomName() {
    return `Build Credentials ${(0, nanoid_1.nanoid)(10)}`;
}
