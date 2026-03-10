"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBundleIdExistsAsync = ensureBundleIdExistsAsync;
exports.ensureBundleIdExistsWithNameAsync = ensureBundleIdExistsWithNameAsync;
exports.syncCapabilitiesAsync = syncCapabilitiesAsync;
exports.syncCapabilityIdentifiersAsync = syncCapabilityIdentifiersAsync;
exports.ensureAppExistsAsync = ensureAppExistsAsync;
exports.createAppAsync = createAppAsync;
exports.isAppleError = isAppleError;
const tslib_1 = require("tslib");
const apple_utils_1 = require("@expo/apple-utils");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const node_crypto_1 = require("node:crypto");
const authenticate_1 = require("./authenticate");
const bundleIdCapabilities_1 = require("./bundleIdCapabilities");
const capabilityIdentifiers_1 = require("./capabilityIdentifiers");
const contractMessages_1 = require("./contractMessages");
const log_1 = tslib_1.__importDefault(require("../../../log"));
const ora_1 = require("../../../ora");
/**
 * The entitlement key that indicates a target is an App Clip.
 * When present, the target requires special bundle ID registration with a parent app relationship.
 */
const APP_CLIP_PARENT_APPLICATION_IDENTIFIERS_ENTITLEMENT = 'com.apple.developer.parent-application-identifiers';
async function ensureBundleIdExistsAsync(authCtx, { accountName, projectName, bundleIdentifier }, options) {
    await ensureBundleIdExistsWithNameAsync(authCtx, {
        name: `@${accountName}/${projectName}`,
        bundleIdentifier,
    }, options);
}
async function ensureBundleIdExistsWithNameAsync(authCtx, { name, bundleIdentifier }, options) {
    const context = (0, authenticate_1.getRequestContext)(authCtx);
    // Detect App Clips by the presence of the parent-application-identifiers entitlement
    const isAppClip = Boolean(options?.entitlements?.[APP_CLIP_PARENT_APPLICATION_IDENTIFIERS_ENTITLEMENT]);
    const typeLabel = isAppClip ? 'App Clip bundle identifier' : 'bundle identifier';
    const spinner = (0, ora_1.ora)(`Linking ${typeLabel} ${chalk_1.default.dim(bundleIdentifier)}`).start();
    let bundleId;
    try {
        // Get the bundle id
        bundleId = await apple_utils_1.BundleId.findAsync(context, { identifier: bundleIdentifier });
        if (!bundleId) {
            spinner.text = `Registering ${typeLabel} ${chalk_1.default.dim(bundleIdentifier)}`;
            if (isAppClip && options?.parentBundleIdentifier) {
                // App Clips require the parent bundle ID's opaque ID
                bundleId = await createAppClipBundleIdAsync(context, {
                    name,
                    bundleIdentifier,
                    parentBundleIdentifier: options.parentBundleIdentifier,
                });
            }
            else {
                // If it doesn't exist, create it
                bundleId = await apple_utils_1.BundleId.createAsync(context, {
                    name,
                    identifier: bundleIdentifier,
                });
            }
        }
        spinner.succeed(`${isAppClip ? 'App Clip bundle' : 'Bundle'} identifier registered ${chalk_1.default.dim(bundleIdentifier)}`);
    }
    catch (err) {
        if (err.message.match(/An App ID with Identifier '(.*)' is not available/)) {
            spinner.fail(`The ${typeLabel} ${chalk_1.default.bold(bundleIdentifier)} is not available to team "${authCtx.team.name}" (${authCtx.team.id}), change it in your app config and try again.`);
        }
        else {
            spinner.fail(`Failed to register ${typeLabel} ${chalk_1.default.dim(bundleIdentifier)}`);
            // Assert contract errors for easier resolution when the user has an expired developer account.
            if (err.message.match(/forbidden for security reasons/) ||
                // Unable to process request - PLA Update available - You currently don't have access to this membership resource. To resolve this issue, agree to the latest Program License Agreement in your developer account.
                err.message.match(/agree/)) {
                if ((0, authenticate_1.isUserAuthCtx)(authCtx)) {
                    await (0, contractMessages_1.assertContractMessagesAsync)(context);
                }
                else {
                    log_1.default.warn(`You currently don't have access to this membership resource. To resolve this issue, agree to the latest Program License Agreement in your developer account.`);
                }
            }
        }
        throw err;
    }
    if (options) {
        await syncCapabilitiesAsync(bundleId, options);
    }
}
/**
 * Creates an App Clip bundle identifier.
 * App Clips require the parent bundle ID's opaque ID for registration.
 */
async function createAppClipBundleIdAsync(context, { name, bundleIdentifier, parentBundleIdentifier, }) {
    // First, find the parent bundle ID to get its opaque ID
    const parentBundleId = await apple_utils_1.BundleId.findAsync(context, {
        identifier: parentBundleIdentifier,
    });
    if (!parentBundleId) {
        throw new Error(`Cannot create App Clip bundle identifier "${bundleIdentifier}" because the parent bundle identifier "${parentBundleIdentifier}" is not registered. ` +
            `Please ensure the parent app's bundle identifier is registered first.`);
    }
    // Create the App Clip bundle ID with the parent relationship
    return await apple_utils_1.BundleId.createAppClipAsync(context, {
        name,
        identifier: bundleIdentifier,
        parentBundleIdId: parentBundleId.id,
    });
}
async function syncCapabilitiesAsync(bundleId, { entitlements, ...rest }) {
    const spinner = (0, ora_1.ora)(`Syncing capabilities`).start();
    // Stop spinning in debug mode so we can print other information
    if (log_1.default.isDebug) {
        spinner.stop();
    }
    try {
        const { enabled, disabled } = await (0, bundleIdCapabilities_1.syncCapabilitiesForEntitlementsAsync)(bundleId, entitlements, rest);
        const results = [buildMessage('Enabled', enabled), buildMessage('Disabled', disabled)]
            .filter(Boolean)
            .join(' | ') || 'No updates';
        spinner.succeed(`Synced capabilities: ` + chalk_1.default.dim(results));
    }
    catch (err) {
        spinner.fail(`Failed to sync capabilities ${chalk_1.default.dim(bundleId.attributes.identifier)}`);
        throw err;
    }
    // Always run this after syncing the capabilities...
    await syncCapabilityIdentifiersAsync(bundleId, { entitlements, ...rest });
}
const buildMessage = (title, items) => items.length ? `${title}: ${items.join(', ')}` : '';
async function syncCapabilityIdentifiersAsync(bundleId, { entitlements }) {
    const spinner = (0, ora_1.ora)(`Syncing capabilities identifiers`).start();
    // Stop spinning in debug mode so we can print other information
    if (log_1.default.isDebug) {
        spinner.stop();
    }
    try {
        const { created, linked } = await (0, capabilityIdentifiers_1.syncCapabilityIdentifiersForEntitlementsAsync)(bundleId, entitlements);
        const results = [buildMessage('Created', created), buildMessage('Linked', linked)]
            .filter(Boolean)
            .join(' | ') || 'No updates';
        spinner.succeed(`Synced capability identifiers: ` + chalk_1.default.dim(results));
    }
    catch (err) {
        spinner.fail(`Failed to sync capability identifiers ${chalk_1.default.dim(bundleId.attributes.identifier)}`);
        throw err;
    }
}
async function ensureAppExistsAsync(userAuthCtx, { name, language, companyName, bundleIdentifier, sku, }) {
    const context = (0, authenticate_1.getRequestContext)(userAuthCtx);
    const spinner = (0, ora_1.ora)(`Linking to App Store Connect ${chalk_1.default.dim(bundleIdentifier)}`).start();
    let app = await apple_utils_1.App.findAsync(context, { bundleId: bundleIdentifier });
    if (!app) {
        spinner.text = `Creating App Store Connect app ${chalk_1.default.bold(name)} ${chalk_1.default.dim(bundleIdentifier)}`;
        try {
            // Assert contract errors when the user needs to create an app.
            await (0, contractMessages_1.assertContractMessagesAsync)(context, spinner);
            /**
             * **Does not support App Store Connect API (CI).**
             */
            app = await createAppAsync(context, {
                bundleId: bundleIdentifier,
                name,
                primaryLocale: language,
                companyName,
                sku,
            });
        }
        catch (error) {
            if (error.message.match(/An App ID with Identifier '(.*)' is not available/)) {
                throw new Error(`\nThe bundle identifier "${bundleIdentifier}" is not available to provider "${userAuthCtx.authState?.session.provider.name}. Change it in your app config and try again.\n`);
            }
            spinner.fail(`Failed to create App Store app ${chalk_1.default.dim(name)}`);
            error.message +=
                '\nVisit https://appstoreconnect.apple.com and resolve any warnings, then try again.';
            throw error;
        }
    }
    else {
        // TODO: Update app name when API gives us that possibility
    }
    spinner.succeed(`Prepared App Store Connect for ${chalk_1.default.bold(name)} ${chalk_1.default.dim(bundleIdentifier)}`);
    return app;
}
function sanitizeName(name) {
    return (name
        // Replace emojis with a `-`
        .replace(/[\p{Emoji}]/gu, '-')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim());
}
async function createAppAsync(context, props, retryCount = 0) {
    try {
        /**
         * **Does not support App Store Connect API (CI).**
         */
        return await apple_utils_1.App.createAsync(context, props);
    }
    catch (error) {
        if (retryCount >= 5) {
            throw error;
        }
        if (error instanceof Error) {
            const handleDuplicateNameErrorAsync = async () => {
                const generatedName = props.name + ` (${(0, node_crypto_1.randomBytes)(3).toString('hex')})`;
                log_1.default.warn(`App name "${props.name}" is already taken. Using generated name "${generatedName}" which can be changed later from https://appstoreconnect.apple.com.`);
                // Sanitize the name and try again.
                return await createAppAsync(context, {
                    ...props,
                    name: generatedName,
                }, retryCount + 1);
            };
            if (isAppleError(error)) {
                // New error class that is thrown when the name is already taken but belongs to you.
                if (error.data.errors.some(e => e.code === 'ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE.SAME_ACCOUNT' ||
                    e.code === 'ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE.DIFFERENT_ACCOUNT')) {
                    return await handleDuplicateNameErrorAsync();
                }
            }
            if ('code' in error && typeof error.code === 'string') {
                if (
                // Name is invalid
                error.code === 'APP_CREATE_NAME_INVALID'
                // UnexpectedAppleResponse: An attribute value has invalid characters. - App Name contains certain Unicode symbols, emoticons, diacritics, special characters, or private use characters that are not permitted.
                // Name is taken
                ) {
                    const sanitizedName = sanitizeName(props.name);
                    if (sanitizedName === props.name) {
                        throw error;
                    }
                    log_1.default.warn(`App name "${props.name}" contains invalid characters. Using sanitized name "${sanitizedName}" which can be changed later from https://appstoreconnect.apple.com.`);
                    // Sanitize the name and try again.
                    return await createAppAsync(context, {
                        ...props,
                        name: sanitizedName,
                    }, retryCount + 1);
                }
                if (
                // UnexpectedAppleResponse: The provided entity includes an attribute with a value that has already been used on a different account. - The App Name you entered is already being used. If you have trademark rights to
                // this name and would like it released for your use, submit a claim.
                error.code === 'APP_CREATE_NAME_UNAVAILABLE') {
                    return await handleDuplicateNameErrorAsync();
                }
            }
        }
        throw error;
    }
}
function isAppleError(error) {
    return 'data' in error && 'errors' in error.data && Array.isArray(error.data.errors);
}
