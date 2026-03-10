"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPO_NO_CAPABILITY_SYNC = void 0;
exports.syncCapabilitiesForEntitlementsAsync = syncCapabilitiesForEntitlementsAsync;
exports.assertValidOptions = assertValidOptions;
const tslib_1 = require("tslib");
const apple_utils_1 = require("@expo/apple-utils");
const getenv_1 = tslib_1.__importDefault(require("getenv"));
const util_1 = require("util");
const capabilityList_1 = require("./capabilityList");
const log_1 = tslib_1.__importDefault(require("../../../log"));
exports.EXPO_NO_CAPABILITY_SYNC = getenv_1.default.boolish('EXPO_NO_CAPABILITY_SYNC', false);
/**
 * Given an entitlements JSON object, synchronizes the remote capabilities for a bundle identifier.
 *
 * Example entitlements JSON:
 * ```js
 * {
 *   'com.apple.developer.healthkit': true,
 *   'com.apple.developer.in-app-payments': ['merchant.com.example.development'],
 * }
 * ```
 *
 * @param bundleId bundle identifier object
 * @param entitlements JSON representation of the entitlements plist
 * @param additionalOptions Additional options to consider when syncing capabilities.
 * @returns
 */
async function syncCapabilitiesForEntitlementsAsync(bundleId, entitlements = {}, additionalOptions) {
    if (exports.EXPO_NO_CAPABILITY_SYNC) {
        return { enabled: [], disabled: [] };
    }
    const currentCapabilities = await bundleId.getBundleIdCapabilitiesAsync();
    if (log_1.default.isDebug) {
        log_1.default.log(`Current remote capabilities:\n${JSON.stringify(currentCapabilities, null, 2)}`);
        log_1.default.log(`\nCurrent local entitlements:\n${JSON.stringify(entitlements, null, 2)}`);
    }
    const { enabledCapabilityNames, request, remainingCapabilities } = getCapabilitiesToEnable(currentCapabilities, entitlements, additionalOptions);
    const { disabledCapabilityNames, request: modifiedRequest } = getCapabilitiesToDisable(bundleId, remainingCapabilities, request, entitlements);
    if (modifiedRequest.length) {
        log_1.default.debug(`Patch Request:`, (0, util_1.inspect)(modifiedRequest, { depth: null, colors: true }));
        try {
            await bundleId.updateBundleIdCapabilityAsync(modifiedRequest);
        }
        catch (error) {
            if (error.message.match(/bundle '[\w\d]+' cannot be deleted. Delete all the Apps/)) {
                log_1.default.error('Failed to patch capabilities:', (0, util_1.inspect)(modifiedRequest, { depth: null, colors: true }));
                throw new Error(`Unexpected error occurred while attempting to update capabilities for app "${bundleId.attributes.identifier}".\nCapabilities can be modified manually in the Apple developer console at https://developer-mdn.apple.com/account/resources/identifiers/bundleId/edit/${bundleId.id}.\nAuto capability syncing can be disabled with the environment variable \`EXPO_NO_CAPABILITY_SYNC=1\`.\n${error.message}`);
            }
        }
    }
    return { enabled: enabledCapabilityNames, disabled: disabledCapabilityNames };
}
function getCapabilitiesToEnable(currentRemoteCapabilities, entitlements, additionalOptions) {
    const enabledCapabilityNames = [];
    const request = [];
    const remainingCapabilities = [...currentRemoteCapabilities];
    for (const [key, value] of Object.entries(entitlements)) {
        const staticCapabilityInfo = capabilityList_1.CapabilityMapping.find(capability => capability.entitlement === key);
        if (!staticCapabilityInfo) {
            if (log_1.default.isDebug) {
                log_1.default.log(`Skipping entitlement that is not supported by EAS: ${key}`);
            }
            continue;
        }
        assertValidOptions(staticCapabilityInfo, value);
        const existingIndex = remainingCapabilities.findIndex(existing => existing.isType(staticCapabilityInfo.capability));
        const existingRemote = existingIndex > -1 ? remainingCapabilities[existingIndex] : null;
        const operation = staticCapabilityInfo.getSyncOperation({
            existingRemote,
            entitlements,
            entitlementValue: value,
            additionalOptions,
        });
        const { op } = operation;
        if (log_1.default.isDebug) {
            log_1.default.log(`Will ${op} remote capability: ${key} (${staticCapabilityInfo.name}).`);
        }
        if (op === 'enable') {
            enabledCapabilityNames.push(staticCapabilityInfo.name);
            request.push({
                capabilityType: staticCapabilityInfo.capability,
                option: operation.option,
            });
        }
        else if (op === 'skip' && existingIndex >= 0) {
            // Remove the item from the list of capabilities so we don't disable it in the next step.
            remainingCapabilities.splice(existingIndex, 1);
        }
    }
    return { enabledCapabilityNames, request, remainingCapabilities };
}
function assertValidOptions(classifier, value) {
    if (!classifier.validateOptions(value)) {
        let reason = '';
        if (classifier.capabilityIdPrefix) {
            // Assert string array matching prefix. ASC will throw if the IDs are invalid, this just saves some time.
            reason = ` Expected an array of strings, where each string is prefixed with "${classifier.capabilityIdPrefix}", ex: ["${classifier.capabilityIdPrefix}myapp"]`;
        }
        throw new Error(`iOS entitlement "${classifier.entitlement}" has invalid value "${value}".${reason}`);
    }
}
function getCapabilitiesToDisable(bundleId, currentCapabilities, request, entitlements) {
    if (log_1.default.isDebug) {
        log_1.default.log(`Existing to disable: `, currentCapabilities.map(({ id }) => id));
    }
    const disabledCapabilityNames = [];
    // Disable any extras that aren't present, this functionality is kinda unreliable because managed apps
    // might be enabling capabilities in modifiers.
    for (const existingCapability of currentCapabilities) {
        // GC and IAP are always enabled in apps by default so we should avoid modifying them.
        if (existingCapability.isType(apple_utils_1.CapabilityType.IN_APP_PURCHASE) ||
            existingCapability.isType(apple_utils_1.CapabilityType.GAME_CENTER)) {
            continue;
        }
        if (existingCapability.attributes) {
            const adjustedType = getAdjustedCapabilityType(existingCapability, bundleId);
            if (adjustedType === apple_utils_1.CapabilityType.MDM_MANAGED_ASSOCIATED_DOMAINS &&
                entitlements[capabilityList_1.associatedDomainsCapabilityType.entitlement]) {
                // MDM Managed Associated Domains is a special case, it should not be disabled if Associated Domains is enabled.
                continue;
            }
            // Only disable capabilities that we handle,
            // this enables devs to turn on capabilities outside of EAS without worrying about us disabling them.
            const staticCapabilityInfo = capabilityList_1.CapabilityMapping.find(capability => capability.capability === adjustedType);
            if (staticCapabilityInfo &&
                !request.find(request => request.capabilityType && existingCapability.isType(request.capabilityType))) {
                request.push({
                    // @ts-expect-error
                    capabilityType: adjustedType,
                    option: apple_utils_1.CapabilityTypeOption.OFF,
                });
                disabledCapabilityNames.push(staticCapabilityInfo.name);
            }
        }
    }
    return { disabledCapabilityNames, request };
}
function getAdjustedCapabilityType(existingCapability, bundleId) {
    let adjustedType = existingCapability.attributes.capabilityType;
    if (!adjustedType) {
        if (process.env.NODE_ENV === 'test' && !existingCapability.id.startsWith(`${bundleId.id}_`)) {
            throw new Error(`Capability ID "${existingCapability.id}" does not start with the bundle ID "${bundleId.id}_". This is likely a test setup issue.`);
        }
        adjustedType = existingCapability.id.replace(`${bundleId.id}_`, '');
    }
    return adjustedType;
}
