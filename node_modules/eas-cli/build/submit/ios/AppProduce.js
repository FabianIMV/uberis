"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAppStoreConnectAppExistsAsync = ensureAppStoreConnectAppExistsAsync;
const tslib_1 = require("tslib");
const apple_utils_1 = require("@expo/apple-utils");
const language_1 = require("./utils/language");
const authenticate_1 = require("../../credentials/ios/appstore/authenticate");
const ensureAppExists_1 = require("../../credentials/ios/appstore/ensureAppExists");
const ensureTestFlightGroup_1 = require("../../credentials/ios/appstore/ensureTestFlightGroup");
const log_1 = tslib_1.__importDefault(require("../../log"));
const bundleIdentifier_1 = require("../../project/ios/bundleIdentifier");
const prompts_1 = require("../../prompts");
async function ensureAppStoreConnectAppExistsAsync(ctx) {
    const { exp } = ctx;
    const { appName, language } = ctx.profile;
    const options = {
        ...ctx.profile,
        bundleIdentifier: ctx.applicationIdentifierOverride ??
            ctx.profile.bundleIdentifier ??
            (await (0, bundleIdentifier_1.getBundleIdentifierAsync)(ctx.projectDir, exp, ctx.vcsClient)),
        appName: appName ?? exp.name ?? (await promptForAppNameAsync()),
        language: (0, language_1.sanitizeLanguage)(language),
    };
    return await createAppStoreConnectAppAsync(ctx, options);
}
async function isProvisioningAvailableAsync(requestCtx) {
    const session = apple_utils_1.Session.getAnySessionInfo();
    // TODO: Investigate if username and email can be different
    const username = session?.user.emailAddress;
    const [user] = await apple_utils_1.User.getAsync(requestCtx, { query: { filter: { username } } });
    return user.attributes.provisioningAllowed;
}
async function createAppStoreConnectAppAsync(ctx, options) {
    const { appleId, appleTeamId, bundleIdentifier: bundleId, appName, language, companyName, sku, } = options;
    const userAuthCtx = await ctx.credentialsCtx.appStore.ensureUserAuthenticatedAsync({
        appleId,
        teamId: appleTeamId,
    });
    const requestCtx = (0, authenticate_1.getRequestContext)(userAuthCtx);
    log_1.default.addNewLineIfNone();
    if (await isProvisioningAvailableAsync(requestCtx)) {
        await (0, ensureAppExists_1.ensureBundleIdExistsWithNameAsync)(userAuthCtx, {
            name: appName,
            bundleIdentifier: bundleId,
        });
    }
    else {
        log_1.default.warn(`Provisioning is not available for Apple User: ${userAuthCtx.appleId}, skipping bundle identifier check.`);
    }
    const app = await (0, ensureAppExists_1.ensureAppExistsAsync)(userAuthCtx, {
        name: appName,
        language,
        companyName,
        bundleIdentifier: bundleId,
        sku,
    });
    try {
        await (0, ensureTestFlightGroup_1.ensureTestFlightGroupExistsAsync)(app);
    }
    catch (error) {
        // This process is not critical to the app submission so we shouldn't let it fail the entire process.
        log_1.default.error('Failed to create an internal TestFlight group. This can be done manually in the App Store Connect website.');
        log_1.default.error(error);
    }
    return {
        ascAppIdentifier: app.id,
    };
}
async function promptForAppNameAsync() {
    const { appName } = await (0, prompts_1.promptAsync)({
        type: 'text',
        name: 'appName',
        message: 'What would you like to name your app?',
        validate: (val) => val !== '' || 'App name cannot be empty!',
    });
    return appName;
}
