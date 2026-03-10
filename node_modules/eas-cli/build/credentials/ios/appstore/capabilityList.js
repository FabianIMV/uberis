"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.associatedDomainsCapabilityType = exports.CapabilityMapping = void 0;
const tslib_1 = require("tslib");
const apple_utils_1 = require("@expo/apple-utils");
const invariant_1 = require("graphql/jsutils/invariant");
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const log_1 = tslib_1.__importDefault(require("../../../log"));
const validateBooleanOptions = (options) => {
    return typeof options === 'boolean';
};
const validatePrefixedStringArrayOptions = (prefix) => (options) => {
    return (Array.isArray(options) &&
        options.every(option => typeof option === 'string' && option.startsWith(prefix)));
};
const validateStringArrayOptions = (options) => {
    return Array.isArray(options) && options.every(option => typeof option === 'string');
};
const createValidateStringOptions = (allowed) => (options) => {
    return allowed.includes(options);
};
const createValidateStringArrayOptions = (allowed) => (options) => {
    return Array.isArray(options) && options.every(option => allowed.includes(option));
};
const validateDevProdString = createValidateStringOptions(['development', 'production']);
const skipOp = { op: 'skip' };
const disableOp = { op: 'disable' };
const enableOp = { op: 'enable', option: apple_utils_1.CapabilityTypeOption.ON };
const getBooleanSyncOperation = ({ existingRemote, entitlementValue }) => {
    if (existingRemote) {
        // If the remote capability exists, we only disable it if the value is false.
        // Otherwise, we skip it.
        if ('enabled' in existingRemote.attributes) {
            return existingRemote.attributes['enabled'] === entitlementValue ? skipOp : disableOp;
        }
        return existingRemote.attributes.settings === null ? skipOp : enableOp;
    }
    else {
        return entitlementValue === false ? skipOp : enableOp;
    }
};
const getDefinedValueSyncOperation = ({ existingRemote }) => {
    if (!existingRemote) {
        // If the remote capability does not exist, we create it.
        return enableOp;
    }
    return existingRemote.attributes.settings === null ? skipOp : enableOp;
};
const capabilityWithSettingsSyncOperation = ({ existingRemote, entitlementValue, }) => {
    // settings are defined for only a few capabilities: iCloud, data protection and Sign in with Apple
    // https://developer.apple.com/documentation/appstoreconnectapi/capabilitysetting
    if (!existingRemote) {
        return enableOp;
    }
    const { attributes, id } = existingRemote;
    if ('enabled' in attributes) {
        // the `enabled` field should be available as per https://developer.apple.com/documentation/appstoreconnectapi/capabilitysetting
        const existingEnabled = attributes.enabled === true;
        // If both are enabled and the existing one has settings, skip the update
        if (existingEnabled && entitlementValue && attributes.settings) {
            return skipOp;
        }
        const newOption = entitlementValue ? apple_utils_1.CapabilityTypeOption.ON : apple_utils_1.CapabilityTypeOption.OFF;
        // If the states don't match, we need to update
        const newEnabled = newOption === apple_utils_1.CapabilityTypeOption.ON;
        return existingEnabled === newEnabled ? skipOp : { op: 'enable', option: newOption };
    }
    else {
        if (log_1.default.isDebug) {
            log_1.default.log(`Expected the "enabled" attribute in ${id} but it was not present (attributes: ${JSON.stringify(attributes, null, 2)}). Will skip syncing this capability.`);
        }
        return skipOp;
    }
};
// NOTE(Bacon): From manually toggling values in Xcode and checking the git diff and network requests.
// Last Updated: July 22nd, 2021
// https://developer-mdn.apple.com/documentation/bundleresources/entitlements
exports.CapabilityMapping = [
    {
        name: 'HomeKit',
        entitlement: 'com.apple.developer.homekit',
        capability: apple_utils_1.CapabilityType.HOME_KIT,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Hotspot',
        entitlement: 'com.apple.developer.networking.HotspotConfiguration',
        capability: apple_utils_1.CapabilityType.HOT_SPOT,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Multipath',
        entitlement: 'com.apple.developer.networking.multipath',
        capability: apple_utils_1.CapabilityType.MULTIPATH,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'SiriKit',
        entitlement: 'com.apple.developer.siri',
        capability: apple_utils_1.CapabilityType.SIRI_KIT,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Wireless Accessory Configuration',
        entitlement: 'com.apple.external-accessory.wireless-configuration',
        capability: apple_utils_1.CapabilityType.WIRELESS_ACCESSORY,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Extended Virtual Address Space',
        entitlement: 'com.apple.developer.kernel.extended-virtual-addressing',
        capability: apple_utils_1.CapabilityType.EXTENDED_VIRTUAL_ADDRESSING,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Access WiFi Information',
        entitlement: 'com.apple.developer.networking.wifi-info',
        capability: apple_utils_1.CapabilityType.ACCESS_WIFI,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Associated Domains',
        entitlement: 'com.apple.developer.associated-domains',
        capability: apple_utils_1.CapabilityType.ASSOCIATED_DOMAINS,
        validateOptions: validateStringArrayOptions,
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        name: 'AutoFill Credential Provider',
        entitlement: 'com.apple.developer.authentication-services.autofill-credential-provider',
        capability: apple_utils_1.CapabilityType.AUTO_FILL_CREDENTIAL,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'HealthKit',
        entitlement: 'com.apple.developer.healthkit',
        capability: apple_utils_1.CapabilityType.HEALTH_KIT,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    //   {
    //     // ?? -- adds UIRequiredDeviceCapabilities gamekit
    //     // Always locked on in dev portal
    //     name: 'Game Center',
    //     entitlement: 'com.apple.developer.game-center',
    //     capability: CapabilityType.GAME_CENTER,
    //     validateOptions: validateBooleanOptions,
    //         getSyncOperation: getBooleanSyncOperation,
    //   },
    {
        name: 'App Groups',
        entitlement: 'com.apple.security.application-groups',
        capability: apple_utils_1.CapabilityType.APP_GROUP,
        // Ex: ['group.CY-A5149AC2-49FC-11E7-B3F3-0335A16FFB8D.com.cydia.Extender']
        validateOptions: validatePrefixedStringArrayOptions('group.'),
        getSyncOperation: getDefinedValueSyncOperation,
        capabilityIdModel: apple_utils_1.AppGroup,
        capabilityIdPrefix: 'group.',
    },
    {
        name: 'Apple Pay Payment Processing',
        entitlement: 'com.apple.developer.in-app-payments',
        capability: apple_utils_1.CapabilityType.APPLE_PAY,
        // Ex: ['merchant.com.example.development']
        validateOptions: validatePrefixedStringArrayOptions('merchant.'),
        getSyncOperation: getDefinedValueSyncOperation,
        capabilityIdModel: apple_utils_1.MerchantId,
        capabilityIdPrefix: 'merchant.',
    },
    {
        name: 'iCloud',
        entitlement: 'com.apple.developer.icloud-container-identifiers',
        capability: apple_utils_1.CapabilityType.ICLOUD,
        validateOptions: validatePrefixedStringArrayOptions('iCloud.'),
        // Only supports Xcode +6
        getSyncOperation: capabilityWithSettingsSyncOperation,
        capabilityIdModel: apple_utils_1.CloudContainer,
        capabilityIdPrefix: 'iCloud.',
    },
    {
        name: 'ClassKit',
        entitlement: 'com.apple.developer.ClassKit-environment',
        capability: apple_utils_1.CapabilityType.CLASS_KIT,
        validateOptions: validateDevProdString,
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        name: 'Communication Notifications',
        entitlement: 'com.apple.developer.usernotifications.communication',
        capability: apple_utils_1.CapabilityType.USER_NOTIFICATIONS_COMMUNICATION,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Time Sensitive Notifications',
        entitlement: 'com.apple.developer.usernotifications.time-sensitive',
        capability: apple_utils_1.CapabilityType.USER_NOTIFICATIONS_TIME_SENSITIVE,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Group Activities',
        entitlement: 'com.apple.developer.group-session',
        capability: apple_utils_1.CapabilityType.GROUP_ACTIVITIES,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        name: 'Family Controls',
        entitlement: 'com.apple.developer.family-controls',
        capability: apple_utils_1.CapabilityType.FAMILY_CONTROLS,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        // https://developer-mdn.apple.com/documentation/bundleresources/entitlements/com_apple_developer_default-data-protection
        name: 'Data Protection',
        entitlement: 'com.apple.developer.default-data-protection',
        capability: apple_utils_1.CapabilityType.DATA_PROTECTION,
        validateOptions: createValidateStringOptions([
            'NSFileProtectionCompleteUnlessOpen',
            'NSFileProtectionCompleteUntilFirstUserAuthentication',
            'NSFileProtectionNone',
            'NSFileProtectionComplete',
        ]),
        getSyncOperation: ({ existingRemote, entitlementValue: entitlement }) => {
            const newValue = (() => {
                if (entitlement === 'NSFileProtectionComplete') {
                    return apple_utils_1.CapabilityTypeDataProtectionOption.COMPLETE_PROTECTION;
                }
                else if (entitlement === 'NSFileProtectionCompleteUnlessOpen') {
                    return apple_utils_1.CapabilityTypeDataProtectionOption.PROTECTED_UNLESS_OPEN;
                }
                else if (entitlement === 'NSFileProtectionCompleteUntilFirstUserAuthentication') {
                    return apple_utils_1.CapabilityTypeDataProtectionOption.PROTECTED_UNTIL_FIRST_USER_AUTH;
                }
                // NSFileProtectionNone isn't documented, not sure how to handle
                throw new Error(`iOS entitlement "com.apple.developer.default-data-protection" is using unsupported value "${entitlement}"`);
            })();
            const enableOp = { op: 'enable', option: newValue };
            if (!existingRemote) {
                return enableOp;
            }
            (0, invariant_1.invariant)(existingRemote.attributes.settings?.[0].key === 'DATA_PROTECTION_PERMISSION_LEVEL');
            const oldValue = existingRemote.attributes.settings[0]?.options?.[0]?.key;
            return oldValue === newValue ? skipOp : enableOp;
        },
    },
    {
        // Deprecated
        name: 'Inter-App Audio',
        entitlement: 'inter-app-audio',
        capability: apple_utils_1.CapabilityType.INTER_APP_AUDIO,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        // https://developer-mdn.apple.com/documentation/bundleresources/entitlements/com_apple_developer_networking_networkextension
        name: 'Network Extensions',
        entitlement: 'com.apple.developer.networking.networkextension',
        capability: apple_utils_1.CapabilityType.NETWORK_EXTENSIONS,
        validateOptions: createValidateStringArrayOptions([
            'dns-proxy',
            'app-proxy-provider',
            'content-filter-provider',
            'packet-tunnel-provider',
            'dns-proxy-systemextension',
            'app-proxy-provider-systemextension',
            'content-filter-provider-systemextension',
            'packet-tunnel-provider-systemextension',
            'dns-settings',
            'app-push-provider',
        ]),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        // https://developer-mdn.apple.com/documentation/bundleresources/entitlements/com_apple_developer_nfc_readersession_formats
        name: 'NFC Tag Reading',
        entitlement: 'com.apple.developer.nfc.readersession.formats',
        capability: apple_utils_1.CapabilityType.NFC_TAG_READING,
        // Technically it seems only `TAG` is allowed, but many apps and packages tell users to add `NDEF` as well.
        validateOptions: createValidateStringArrayOptions(['NDEF', 'TAG']),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        name: 'Personal VPN',
        entitlement: 'com.apple.developer.networking.vpn.api',
        capability: apple_utils_1.CapabilityType.PERSONAL_VPN,
        // Ex: ['allow-vpn']
        validateOptions: createValidateStringArrayOptions(['allow-vpn']),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        // https://developer-mdn.apple.com/documentation/bundleresources/entitlements/com_apple_developer_networking_vpn_api
        name: 'Push Notifications',
        // com.apple.developer.aps-environment
        entitlement: 'aps-environment',
        capability: apple_utils_1.CapabilityType.PUSH_NOTIFICATIONS,
        validateOptions: validateDevProdString,
        getSyncOperation: ({ existingRemote, entitlementValue: entitlement, additionalOptions: { usesBroadcastPushNotifications }, }) => {
            const newOption = (() => {
                const option = entitlement ? apple_utils_1.CapabilityTypeOption.ON : apple_utils_1.CapabilityTypeOption.OFF;
                if (option === apple_utils_1.CapabilityTypeOption.ON && usesBroadcastPushNotifications) {
                    return apple_utils_1.CapabilityTypePushNotificationsOption.PUSH_NOTIFICATION_FEATURE_BROADCAST;
                }
                return option;
            })();
            const createOp = { op: 'enable', option: newOption };
            if (!existingRemote) {
                // If the remote capability does not exist, we create it.
                return createOp;
            }
            // For push notifications, we should always update the capability if
            // - settings are not defined in the existing capability, but usesBroadcastPushNotifications is enabled (we want to add settings for this capability)
            // - settings are defined in the existing capability, but usesBroadcastPushNotifications is disabled (we want to remove settings for this capability)
            const noSettingsAttributes = existingRemote.attributes.settings == null;
            return !noSettingsAttributes === usesBroadcastPushNotifications ? skipOp : createOp;
        },
    },
    {
        name: 'Wallet',
        entitlement: 'com.apple.developer.pass-type-identifiers',
        capability: apple_utils_1.CapabilityType.WALLET,
        // Ex: ['$(TeamIdentifierPrefix)*']
        validateOptions: validateStringArrayOptions,
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        name: 'Sign In with Apple',
        entitlement: 'com.apple.developer.applesignin',
        capability: apple_utils_1.CapabilityType.APPLE_ID_AUTH,
        // Ex: ['Default']
        validateOptions: createValidateStringArrayOptions(['Default']),
        getSyncOperation: capabilityWithSettingsSyncOperation,
    },
    {
        name: 'Fonts',
        entitlement: 'com.apple.developer.user-fonts',
        capability: apple_utils_1.CapabilityType.FONT_INSTALLATION,
        validateOptions: createValidateStringArrayOptions(['app-usage', 'system-installation']),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        name: 'Apple Pay Later Merchandising',
        entitlement: 'com.apple.developer.pay-later-merchandising',
        capability: apple_utils_1.CapabilityType.APPLE_PAY_LATER_MERCHANDISING,
        validateOptions: createValidateStringArrayOptions(['payinfour-merchandising']),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        name: 'Sensitive Content Analysis',
        entitlement: 'com.apple.developer.sensitivecontentanalysis.client',
        capability: apple_utils_1.CapabilityType.SENSITIVE_CONTENT_ANALYSIS,
        validateOptions: createValidateStringArrayOptions(['analysis']),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        // Not in Xcode
        // https://developer-mdn.apple.com/documentation/devicecheck/preparing_to_use_the_app_attest_service
        // https://developer-mdn.apple.com/documentation/bundleresources/entitlements/com_apple_developer_devicecheck_appattest-environment
        name: 'App Attest',
        entitlement: 'com.apple.developer.devicecheck.appattest-environment',
        capability: apple_utils_1.CapabilityType.APP_ATTEST,
        validateOptions: validateDevProdString,
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.coremedia.hls.low-latency',
        name: 'Low Latency HLS',
        capability: apple_utils_1.CapabilityType.HLS_LOW_LATENCY,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.associated-domains.mdm-managed',
        name: 'MDM Managed Associated Domains',
        capability: apple_utils_1.CapabilityType.MDM_MANAGED_ASSOCIATED_DOMAINS,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.fileprovider.testing-mode',
        name: 'FileProvider TestingMode',
        capability: apple_utils_1.CapabilityType.FILE_PROVIDER_TESTING_MODE,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.healthkit.recalibrate-estimates',
        name: 'Recalibrate Estimates',
        capability: apple_utils_1.CapabilityType.HEALTH_KIT_RECALIBRATE_ESTIMATES,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.maps',
        name: 'Maps',
        capability: apple_utils_1.CapabilityType.MAPS,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.user-management',
        name: 'TV Services',
        capability: apple_utils_1.CapabilityType.USER_MANAGEMENT,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.networking.custom-protocol',
        name: 'Custom Network Protocol',
        capability: apple_utils_1.CapabilityType.NETWORK_CUSTOM_PROTOCOL,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.system-extension.install',
        name: 'System Extension',
        capability: apple_utils_1.CapabilityType.SYSTEM_EXTENSION_INSTALL,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.push-to-talk',
        name: 'Push to Talk',
        capability: apple_utils_1.CapabilityType.PUSH_TO_TALK,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.transport.usb',
        name: 'DriverKit USB Transport (development)',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_USB_TRANSPORT_PUB,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.kernel.increased-memory-limit',
        name: 'Increased Memory Limit',
        capability: apple_utils_1.CapabilityType.INCREASED_MEMORY_LIMIT,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.communicates-with-drivers',
        name: 'Communicates with Drivers',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_COMMUNICATES_WITH_DRIVERS,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.media-device-discovery-extension',
        name: 'Media Device Discovery',
        capability: apple_utils_1.CapabilityType.MEDIA_DEVICE_DISCOVERY,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.allow-third-party-userclients',
        name: 'DriverKit Allow Third Party UserClients',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_ALLOW_THIRD_PARTY_USER_CLIENTS,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.weatherkit',
        name: 'WeatherKit',
        capability: apple_utils_1.CapabilityType.WEATHER_KIT,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.on-demand-install-capable',
        name: 'On Demand Install Capable for App Clip Extensions',
        capability: apple_utils_1.CapabilityType.ON_DEMAND_INSTALL_EXTENSIONS,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.family.scsicontroller',
        name: 'DriverKit Family SCSIController (development)',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_FAMILY_SCSI_CONTROLLER_PUB,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.family.serial',
        name: 'DriverKit Family Serial (development)',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_FAMILY_SERIAL_PUB,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.family.networking',
        name: 'DriverKit Family Networking (development)',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_FAMILY_NETWORKING_PUB,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.family.hid.eventservice',
        name: 'DriverKit Family HID EventService (development)',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_FAMILY_HID_EVENT_SERVICE_PUB,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.family.hid.device',
        name: 'DriverKit Family HID Device (development)',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_FAMILY_HID_DEVICE_PUB,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit',
        name: 'DriverKit for Development',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_PUBLIC,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.transport.hid',
        name: 'DriverKit Transport HID (development)',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_TRANSPORT_HID_PUB,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.driverkit.family.audio',
        name: 'DriverKit Family Audio (development)',
        capability: apple_utils_1.CapabilityType.DRIVER_KIT_FAMILY_AUDIO_PUB,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.shared-with-you',
        name: 'Shared with You',
        capability: apple_utils_1.CapabilityType.SHARED_WITH_YOU,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.shared-with-you.collaboration',
        name: 'Messages Collaboration',
        capability: apple_utils_1.CapabilityType.MESSAGES_COLLABORATION,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.submerged-shallow-depth-and-pressure',
        name: 'Shallow Depth and Pressure',
        capability: apple_utils_1.CapabilityType.SHALLOW_DEPTH_PRESSURE,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.proximity-reader.identity.display',
        name: 'Tap to Present ID on iPhone (Display Only)',
        capability: apple_utils_1.CapabilityType.TAP_TO_DISPLAY_ID,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.proximity-reader.payment.acceptance',
        name: 'Tap to Pay on iPhone',
        capability: apple_utils_1.CapabilityType.TAP_TO_PAY_ON_IPHONE,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.matter.allow-setup-payload',
        name: 'Matter Allow Setup Payload',
        capability: apple_utils_1.CapabilityType.MATTER_ALLOW_SETUP_PAYLOAD,
        validateOptions: validateBooleanOptions,
        getSyncOperation: getBooleanSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.journal.allow',
        name: 'Journaling Suggestions',
        capability: apple_utils_1.CapabilityType.JOURNALING_SUGGESTIONS,
        validateOptions: createValidateStringArrayOptions(['suggestions']),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.managed-app-distribution.install-ui',
        name: 'Managed App Installation UI',
        capability: apple_utils_1.CapabilityType.MANAGED_APP_INSTALLATION_UI,
        validateOptions: createValidateStringArrayOptions(['managed-app']),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.networking.slicing.appcategory',
        name: '5G Network Slicing',
        capability: apple_utils_1.CapabilityType.NETWORK_SLICING,
        validateOptions: createValidateStringArrayOptions([
            'gaming-6014',
            'communication-9000',
            'streaming-9001',
        ]),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    {
        entitlement: 'com.apple.developer.networking.slicing.trafficcategory',
        name: '5G Network Slicing',
        capability: apple_utils_1.CapabilityType.NETWORK_SLICING,
        validateOptions: createValidateStringArrayOptions([
            'defaultslice-1',
            'video-2',
            'background-3',
            'voice-4',
            'callsignaling-5',
            'responsivedata-6',
            'avstreaming-7',
            'responsiveav-8',
        ]),
        getSyncOperation: getDefinedValueSyncOperation,
    },
    // VMNET
    // These don't appear to have entitlements, so it's unclear how we can automatically enable / disable them at this time.
    // TODO: Maybe add a warning about manually enabling features?
    // ?? -- links `StoreKit.framework`
    // Always locked on in dev portal
    //   {
    //     entitlement: '',
    //     name: 'In-App Purchase',
    //     capability: CapabilityType.IN_APP_PURCHASE,
    //   },
    //   {
    //     entitlement: '',
    //     name: 'HLS Interstitial Previews',
    //     capability: 'HLS_INTERSTITIAL_PREVIEW',
    //   },
    // "Game Controllers" doesn't appear in Dev Portal but it does show up in Xcode,
    // toggling in Xcode causes no network request to be sent.
    // Therefore it seems that it's a mistake in Xcode,
    // the key `GCSupportsControllerUserInteraction` just needs to be present in Info.plist
    // "Keychain Sharing" doesn't appear in Dev Portal but it does show up in Xcode,
    // toggling in Xcode causes no network request to be sent.
    // Adding to Xcode puts 'keychain-access-groups' into the entitlements so
    // it's not clear if it needs to be updated.
    // "Contact Notes" requires the user to ask Apple in a form:
    // https://developer-mdn.apple.com/contact/request/contact-note-field
    // com.apple.developer.contacts.notes: https://developer-mdn.apple.com/documentation/bundleresources/entitlements/com_apple_developer_contacts_notes/
    // "Exposure Notification" requires the user to ask Apple in a form:
    // https://developer-mdn.apple.com/contact/request/exposure-notification-entitlement
    // com.apple.developer.exposure-notification: https://developer-mdn.apple.com/documentation/bundleresources/entitlements/com_apple_developer_exposure-notification/
];
exports.associatedDomainsCapabilityType = (0, nullthrows_1.default)(exports.CapabilityMapping.find(it => it.capability === apple_utils_1.CapabilityType.ASSOCIATED_DOMAINS));
