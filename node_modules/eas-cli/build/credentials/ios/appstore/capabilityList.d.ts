import { BundleIdCapability, CapabilityType, MerchantId } from '@expo/apple-utils';
import { JSONObject, JSONValue } from '@expo/json-file';
declare const skipOp: {
    readonly op: "skip";
};
declare const disableOp: {
    readonly op: "disable";
};
type GetSyncOperation = (opts: {
    existingRemote: BundleIdCapability | null;
    entitlementValue: JSONValue;
    entitlements: JSONObject;
    additionalOptions: {
        usesBroadcastPushNotifications: boolean;
    };
}) => {
    op: 'enable';
    option: JSONValue;
} | typeof skipOp | typeof disableOp;
export type CapabilityClassifier = {
    name: string;
    entitlement: string;
    capability: CapabilityType;
    validateOptions: (options: any) => boolean;
    capabilityIdModel?: typeof MerchantId;
    getSyncOperation: GetSyncOperation;
    capabilityIdPrefix?: string;
    options?: undefined;
};
export declare const CapabilityMapping: CapabilityClassifier[];
export declare const associatedDomainsCapabilityType: CapabilityClassifier;
export {};
