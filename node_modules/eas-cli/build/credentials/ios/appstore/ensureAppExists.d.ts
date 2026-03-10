import { App, BundleId, RequestContext } from '@expo/apple-utils';
import { JSONObject } from '@expo/json-file';
import { AuthCtx, UserAuthCtx } from './authenticateTypes';
export interface IosCapabilitiesOptions {
    entitlements: JSONObject;
    usesBroadcastPushNotifications: boolean;
    /**
     * The bundle identifier of the parent app. Required for App Clips.
     * App Clips are detected by the presence of the
     * `com.apple.developer.parent-application-identifiers` entitlement.
     */
    parentBundleIdentifier?: string;
}
export interface AppLookupParams {
    accountName: string;
    projectName: string;
    bundleIdentifier: string;
}
export declare function ensureBundleIdExistsAsync(authCtx: AuthCtx, { accountName, projectName, bundleIdentifier }: AppLookupParams, options?: IosCapabilitiesOptions): Promise<void>;
export declare function ensureBundleIdExistsWithNameAsync(authCtx: AuthCtx, { name, bundleIdentifier }: {
    name: string;
    bundleIdentifier: string;
}, options?: IosCapabilitiesOptions): Promise<void>;
export declare function syncCapabilitiesAsync(bundleId: BundleId, { entitlements, ...rest }: IosCapabilitiesOptions): Promise<void>;
export declare function syncCapabilityIdentifiersAsync(bundleId: BundleId, { entitlements }: IosCapabilitiesOptions): Promise<void>;
export declare function ensureAppExistsAsync(userAuthCtx: UserAuthCtx, { name, language, companyName, bundleIdentifier, sku, }: {
    name: string;
    language?: string;
    companyName?: string;
    bundleIdentifier: string;
    sku?: string;
}): Promise<App>;
export declare function createAppAsync(context: RequestContext, props: {
    bundleId: string;
    name: string;
    primaryLocale?: string;
    companyName?: string;
    sku?: string;
}, retryCount?: number): Promise<App>;
export declare function isAppleError(error: any): error is {
    data: {
        errors: {
            id: string;
            status: string;
            /** 'ENTITY_ERROR.ATTRIBUTE.INVALID.INVALID_CHARACTERS' */
            code: string;
            /** 'An attribute value has invalid characters.' */
            title: string;
            /** 'App Name contains certain Unicode symbols, emoticons, diacritics, special characters, or private use characters that are not permitted.' */
            detail: string;
        }[];
    };
};
