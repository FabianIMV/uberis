import { BundleId } from '@expo/apple-utils';
import { JSONObject } from '@expo/json-file';
import { CapabilityClassifier } from './capabilityList';
export declare const EXPO_NO_CAPABILITY_SYNC: boolean;
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
export declare function syncCapabilitiesForEntitlementsAsync(bundleId: BundleId, entitlements: JSONObject | undefined, additionalOptions: {
    usesBroadcastPushNotifications: boolean;
}): Promise<{
    enabled: string[];
    disabled: string[];
}>;
export declare function assertValidOptions(classifier: CapabilityClassifier, value: any): asserts value;
