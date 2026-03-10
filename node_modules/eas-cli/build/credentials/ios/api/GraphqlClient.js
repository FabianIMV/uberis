"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateIosAppBuildCredentialsAsync = createOrUpdateIosAppBuildCredentialsAsync;
exports.getIosAppCredentialsWithBuildCredentialsAsync = getIosAppCredentialsWithBuildCredentialsAsync;
exports.getIosAppCredentialsWithCommonFieldsAsync = getIosAppCredentialsWithCommonFieldsAsync;
exports.createOrGetIosAppCredentialsWithCommonFieldsAsync = createOrGetIosAppCredentialsWithCommonFieldsAsync;
exports.updateIosAppCredentialsAsync = updateIosAppCredentialsAsync;
exports.createOrGetExistingAppleTeamAndUpdateNameIfChangedAsync = createOrGetExistingAppleTeamAndUpdateNameIfChangedAsync;
exports.createOrGetExistingAppleAppIdentifierAsync = createOrGetExistingAppleAppIdentifierAsync;
exports.getDevicesForAppleTeamAsync = getDevicesForAppleTeamAsync;
exports.createProvisioningProfileAsync = createProvisioningProfileAsync;
exports.getProvisioningProfileAsync = getProvisioningProfileAsync;
exports.updateProvisioningProfileAsync = updateProvisioningProfileAsync;
exports.deleteProvisioningProfilesAsync = deleteProvisioningProfilesAsync;
exports.getDistributionCertificateForAppAsync = getDistributionCertificateForAppAsync;
exports.getDistributionCertificatesForAccountAsync = getDistributionCertificatesForAccountAsync;
exports.createDistributionCertificateAsync = createDistributionCertificateAsync;
exports.deleteDistributionCertificateAsync = deleteDistributionCertificateAsync;
exports.createPushKeyAsync = createPushKeyAsync;
exports.getPushKeysForAccountAsync = getPushKeysForAccountAsync;
exports.getPushKeyForAppAsync = getPushKeyForAppAsync;
exports.deletePushKeyAsync = deletePushKeyAsync;
exports.createAscApiKeyAsync = createAscApiKeyAsync;
exports.getAscApiKeysForAccountAsync = getAscApiKeysForAccountAsync;
exports.getAscApiKeyForAppSubmissionsAsync = getAscApiKeyForAppSubmissionsAsync;
exports.deleteAscApiKeyAsync = deleteAscApiKeyAsync;
const tslib_1 = require("tslib");
const apple_utils_1 = require("@expo/apple-utils");
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const AppStoreConnectApiKeyMutation_1 = require("./graphql/mutations/AppStoreConnectApiKeyMutation");
const AppleAppIdentifierMutation_1 = require("./graphql/mutations/AppleAppIdentifierMutation");
const AppleDistributionCertificateMutation_1 = require("./graphql/mutations/AppleDistributionCertificateMutation");
const AppleProvisioningProfileMutation_1 = require("./graphql/mutations/AppleProvisioningProfileMutation");
const ApplePushKeyMutation_1 = require("./graphql/mutations/ApplePushKeyMutation");
const AppleTeamMutation_1 = require("./graphql/mutations/AppleTeamMutation");
const IosAppBuildCredentialsMutation_1 = require("./graphql/mutations/IosAppBuildCredentialsMutation");
const IosAppCredentialsMutation_1 = require("./graphql/mutations/IosAppCredentialsMutation");
const AppStoreConnectApiKeyQuery_1 = require("./graphql/queries/AppStoreConnectApiKeyQuery");
const AppleAppIdentifierQuery_1 = require("./graphql/queries/AppleAppIdentifierQuery");
const AppleDeviceQuery_1 = require("./graphql/queries/AppleDeviceQuery");
const AppleDistributionCertificateQuery_1 = require("./graphql/queries/AppleDistributionCertificateQuery");
const AppleProvisioningProfileQuery_1 = require("./graphql/queries/AppleProvisioningProfileQuery");
const ApplePushKeyQuery_1 = require("./graphql/queries/ApplePushKeyQuery");
const AppleTeamQuery_1 = require("./graphql/queries/AppleTeamQuery");
const IosAppCredentialsQuery_1 = require("./graphql/queries/IosAppCredentialsQuery");
const generated_1 = require("../../../graphql/generated");
const AppQuery_1 = require("../../../graphql/queries/AppQuery");
const bundleIdentifier_1 = require("../../../project/ios/bundleIdentifier");
const errors_1 = require("../errors");
async function getAppAsync(graphqlClient, appLookupParams) {
    const projectFullName = formatProjectFullName(appLookupParams);
    return await AppQuery_1.AppQuery.byFullNameAsync(graphqlClient, projectFullName);
}
async function createOrUpdateIosAppBuildCredentialsAsync(graphqlClient, appLookupParams, { appleTeam, appleAppIdentifierId, iosDistributionType, appleProvisioningProfileId, appleDistributionCertificateId, }) {
    const iosAppCredentials = await createOrGetExistingIosAppCredentialsWithBuildCredentialsAsync(graphqlClient, appLookupParams, {
        appleTeam,
        appleAppIdentifierId,
        iosDistributionType,
    });
    const iosAppBuildCredentials = iosAppCredentials.iosAppBuildCredentialsList?.[0];
    if (!iosAppBuildCredentials) {
        return await IosAppBuildCredentialsMutation_1.IosAppBuildCredentialsMutation.createIosAppBuildCredentialsAsync(graphqlClient, {
            iosDistributionType,
            distributionCertificateId: appleDistributionCertificateId,
            provisioningProfileId: appleProvisioningProfileId,
        }, iosAppCredentials.id);
    }
    else {
        await IosAppBuildCredentialsMutation_1.IosAppBuildCredentialsMutation.setDistributionCertificateAsync(graphqlClient, iosAppBuildCredentials.id, appleDistributionCertificateId);
        return await IosAppBuildCredentialsMutation_1.IosAppBuildCredentialsMutation.setProvisioningProfileAsync(graphqlClient, iosAppBuildCredentials.id, appleProvisioningProfileId);
    }
}
async function getIosAppCredentialsWithBuildCredentialsAsync(graphqlClient, appLookupParams, { iosDistributionType }) {
    const { account, bundleIdentifier } = appLookupParams;
    const appleAppIdentifier = await AppleAppIdentifierQuery_1.AppleAppIdentifierQuery.byBundleIdentifierAsync(graphqlClient, account.name, bundleIdentifier);
    if (!appleAppIdentifier) {
        return null;
    }
    const projectFullName = formatProjectFullName(appLookupParams);
    return await IosAppCredentialsQuery_1.IosAppCredentialsQuery.withBuildCredentialsByAppIdentifierIdAsync(graphqlClient, projectFullName, {
        appleAppIdentifierId: appleAppIdentifier.id,
        iosDistributionType,
    });
}
async function getIosAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams) {
    const { account, bundleIdentifier } = appLookupParams;
    const appleAppIdentifier = await AppleAppIdentifierQuery_1.AppleAppIdentifierQuery.byBundleIdentifierAsync(graphqlClient, account.name, bundleIdentifier);
    if (!appleAppIdentifier) {
        return null;
    }
    const projectFullName = formatProjectFullName(appLookupParams);
    return await IosAppCredentialsQuery_1.IosAppCredentialsQuery.withCommonFieldsByAppIdentifierIdAsync(graphqlClient, projectFullName, {
        appleAppIdentifierId: appleAppIdentifier.id,
    });
}
async function createOrGetIosAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams, { appleTeam, }) {
    const maybeIosAppCredentials = await getIosAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams);
    if (maybeIosAppCredentials) {
        return maybeIosAppCredentials;
    }
    const [app, appleAppIdentifier] = await Promise.all([
        getAppAsync(graphqlClient, appLookupParams),
        createOrGetExistingAppleAppIdentifierAsync(graphqlClient, appLookupParams, appleTeam ?? null),
    ]);
    return await IosAppCredentialsMutation_1.IosAppCredentialsMutation.createIosAppCredentialsAsync(graphqlClient, { appleTeamId: appleTeam?.id }, app.id, appleAppIdentifier.id);
}
async function updateIosAppCredentialsAsync(graphqlClient, appCredentials, { applePushKeyId, ascApiKeyIdForSubmissions, }) {
    let updatedAppCredentials = appCredentials;
    if (applePushKeyId) {
        updatedAppCredentials = await IosAppCredentialsMutation_1.IosAppCredentialsMutation.setPushKeyAsync(graphqlClient, updatedAppCredentials.id, applePushKeyId);
    }
    if (ascApiKeyIdForSubmissions) {
        updatedAppCredentials =
            await IosAppCredentialsMutation_1.IosAppCredentialsMutation.setAppStoreConnectApiKeyForSubmissionsAsync(graphqlClient, updatedAppCredentials.id, ascApiKeyIdForSubmissions);
    }
    return updatedAppCredentials;
}
async function createOrGetExistingIosAppCredentialsWithBuildCredentialsAsync(graphqlClient, appLookupParams, { appleTeam, appleAppIdentifierId, iosDistributionType, }) {
    const maybeIosAppCredentials = await getIosAppCredentialsWithBuildCredentialsAsync(graphqlClient, appLookupParams, {
        iosDistributionType,
    });
    if (maybeIosAppCredentials) {
        return maybeIosAppCredentials;
    }
    else {
        const [app, appleAppIdentifier] = await Promise.all([
            getAppAsync(graphqlClient, appLookupParams),
            createOrGetExistingAppleAppIdentifierAsync(graphqlClient, appLookupParams, appleTeam ?? null),
        ]);
        await IosAppCredentialsMutation_1.IosAppCredentialsMutation.createIosAppCredentialsAsync(graphqlClient, { appleTeamId: appleTeam?.id }, app.id, appleAppIdentifier.id);
        const projectFullName = formatProjectFullName(appLookupParams);
        return (0, nullthrows_1.default)(await IosAppCredentialsQuery_1.IosAppCredentialsQuery.withBuildCredentialsByAppIdentifierIdAsync(graphqlClient, projectFullName, {
            appleAppIdentifierId,
            iosDistributionType,
        }));
    }
}
async function createOrGetExistingAppleTeamAndUpdateNameIfChangedAsync(graphqlClient, accountId, { appleTeamIdentifier, appleTeamName }) {
    const appleTeam = await AppleTeamQuery_1.AppleTeamQuery.getByAppleTeamIdentifierAsync(graphqlClient, accountId, appleTeamIdentifier);
    if (appleTeam) {
        const didAppleTeamNameChange = appleTeamName && appleTeam && appleTeamName !== appleTeam.appleTeamName;
        if (didAppleTeamNameChange) {
            return await AppleTeamMutation_1.AppleTeamMutation.updateAppleTeamAsync(graphqlClient, {
                appleTeamName,
            }, appleTeam.id);
        }
        return appleTeam;
    }
    else {
        return await AppleTeamMutation_1.AppleTeamMutation.createAppleTeamAsync(graphqlClient, { appleTeamIdentifier, appleTeamName }, accountId);
    }
}
async function createOrGetExistingAppleAppIdentifierAsync(graphqlClient, { account, projectName, bundleIdentifier, parentBundleIdentifier }, appleTeam) {
    const appleAppIdentifier = await AppleAppIdentifierQuery_1.AppleAppIdentifierQuery.byBundleIdentifierAsync(graphqlClient, account.name, bundleIdentifier);
    if (appleAppIdentifier) {
        return appleAppIdentifier;
    }
    else {
        if ((0, bundleIdentifier_1.isWildcardBundleIdentifier)(bundleIdentifier) && !appleTeam) {
            throw new errors_1.AppleTeamMissingError(`An Apple Team is required for wildcard bundle identifier: ${bundleIdentifier}`);
        }
        const parentAppleAppIdentifier = parentBundleIdentifier
            ? await createOrGetExistingAppleAppIdentifierAsync(graphqlClient, { account, projectName, bundleIdentifier: parentBundleIdentifier }, appleTeam)
            : null;
        return await AppleAppIdentifierMutation_1.AppleAppIdentifierMutation.createAppleAppIdentifierAsync(graphqlClient, {
            bundleIdentifier,
            appleTeamId: appleTeam?.id,
            parentAppleAppId: parentAppleAppIdentifier?.id,
        }, account.id);
    }
}
async function getDevicesForAppleTeamAsync(graphqlClient, { account }, { appleTeamIdentifier }, { useCache = true } = {}) {
    return await AppleDeviceQuery_1.AppleDeviceQuery.getAllByAppleTeamIdentifierAsync(graphqlClient, account.name, appleTeamIdentifier, {
        useCache,
    });
}
async function createProvisioningProfileAsync(graphqlClient, { account }, appleAppIdentifier, appleProvisioningProfileInput) {
    return await AppleProvisioningProfileMutation_1.AppleProvisioningProfileMutation.createAppleProvisioningProfileAsync(graphqlClient, appleProvisioningProfileInput, account.id, appleAppIdentifier.id);
}
async function getProvisioningProfileAsync(graphqlClient, appLookupParams, iosDistributionType, { appleTeam } = { appleTeam: null }) {
    const projectFullName = formatProjectFullName(appLookupParams);
    const appleAppIdentifier = await createOrGetExistingAppleAppIdentifierAsync(graphqlClient, appLookupParams, appleTeam);
    return await AppleProvisioningProfileQuery_1.AppleProvisioningProfileQuery.getForAppAsync(graphqlClient, projectFullName, {
        appleAppIdentifierId: appleAppIdentifier.id,
        iosDistributionType,
    });
}
async function updateProvisioningProfileAsync(graphqlClient, appleProvisioningProfileId, appleProvisioningProfileInput) {
    return await AppleProvisioningProfileMutation_1.AppleProvisioningProfileMutation.updateAppleProvisioningProfileAsync(graphqlClient, appleProvisioningProfileId, appleProvisioningProfileInput);
}
async function deleteProvisioningProfilesAsync(graphqlClient, appleProvisioningProfileIds) {
    await AppleProvisioningProfileMutation_1.AppleProvisioningProfileMutation.deleteAppleProvisioningProfilesAsync(graphqlClient, appleProvisioningProfileIds);
}
async function getDistributionCertificateForAppAsync(graphqlClient, appLookupParams, iosDistributionType, { appleTeam } = { appleTeam: null }) {
    const projectFullName = formatProjectFullName(appLookupParams);
    const appleAppIdentifier = await createOrGetExistingAppleAppIdentifierAsync(graphqlClient, appLookupParams, appleTeam);
    return await AppleDistributionCertificateQuery_1.AppleDistributionCertificateQuery.getForAppAsync(graphqlClient, projectFullName, {
        appleAppIdentifierId: appleAppIdentifier.id,
        iosDistributionType,
    });
}
async function getDistributionCertificatesForAccountAsync(graphqlClient, account) {
    return await AppleDistributionCertificateQuery_1.AppleDistributionCertificateQuery.getAllForAccountAsync(graphqlClient, account.name);
}
async function createDistributionCertificateAsync(graphqlClient, account, distCert) {
    const appleTeam = await createOrGetExistingAppleTeamAndUpdateNameIfChangedAsync(graphqlClient, account.id, {
        appleTeamIdentifier: distCert.teamId,
        appleTeamName: distCert.teamName,
    });
    return await AppleDistributionCertificateMutation_1.AppleDistributionCertificateMutation.createAppleDistributionCertificateAsync(graphqlClient, {
        certP12: distCert.certP12,
        certPassword: distCert.certPassword,
        certPrivateSigningKey: distCert.certPrivateSigningKey,
        developerPortalIdentifier: distCert.certId,
        appleTeamId: appleTeam.id,
    }, account.id);
}
async function deleteDistributionCertificateAsync(graphqlClient, distributionCertificateId) {
    await AppleDistributionCertificateMutation_1.AppleDistributionCertificateMutation.deleteAppleDistributionCertificateAsync(graphqlClient, distributionCertificateId);
}
async function createPushKeyAsync(graphqlClient, account, pushKey) {
    const appleTeam = await createOrGetExistingAppleTeamAndUpdateNameIfChangedAsync(graphqlClient, account.id, {
        appleTeamIdentifier: pushKey.teamId,
        appleTeamName: pushKey.teamName,
    });
    return await ApplePushKeyMutation_1.ApplePushKeyMutation.createApplePushKeyAsync(graphqlClient, {
        keyP8: pushKey.apnsKeyP8,
        keyIdentifier: pushKey.apnsKeyId,
        appleTeamId: appleTeam.id,
    }, account.id);
}
async function getPushKeysForAccountAsync(graphqlClient, account) {
    return await ApplePushKeyQuery_1.ApplePushKeyQuery.getAllForAccountAsync(graphqlClient, account.name);
}
async function getPushKeyForAppAsync(graphqlClient, appLookupParams) {
    const maybeIosAppCredentials = await getIosAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams);
    return maybeIosAppCredentials?.pushKey ?? null;
}
async function deletePushKeyAsync(graphqlClient, pushKeyId) {
    await ApplePushKeyMutation_1.ApplePushKeyMutation.deleteApplePushKeyAsync(graphqlClient, pushKeyId);
}
async function createAscApiKeyAsync(graphqlClient, account, ascApiKey) {
    const maybeAppleTeam = ascApiKey.teamId
        ? await createOrGetExistingAppleTeamAndUpdateNameIfChangedAsync(graphqlClient, account.id, {
            appleTeamIdentifier: ascApiKey.teamId,
            appleTeamName: ascApiKey.teamName,
        })
        : null;
    return await AppStoreConnectApiKeyMutation_1.AppStoreConnectApiKeyMutation.createAppStoreConnectApiKeyAsync(graphqlClient, {
        issuerIdentifier: ascApiKey.issuerId,
        keyIdentifier: ascApiKey.keyId,
        keyP8: ascApiKey.keyP8,
        name: ascApiKey.name ?? null,
        roles: ascApiKey.roles?.map(role => convertUserRoleToGraphqlType(role)) ?? null,
        appleTeamId: maybeAppleTeam ? maybeAppleTeam.id : null,
    }, account.id);
}
async function getAscApiKeysForAccountAsync(graphqlClient, account) {
    return await AppStoreConnectApiKeyQuery_1.AppStoreConnectApiKeyQuery.getAllForAccountAsync(graphqlClient, account.name);
}
async function getAscApiKeyForAppSubmissionsAsync(graphqlClient, appLookupParams) {
    const maybeIosAppCredentials = await getIosAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams);
    return maybeIosAppCredentials?.appStoreConnectApiKeyForSubmissions ?? null;
}
async function deleteAscApiKeyAsync(graphqlClient, ascApiKeyId) {
    await AppStoreConnectApiKeyMutation_1.AppStoreConnectApiKeyMutation.deleteAppStoreConnectApiKeyAsync(graphqlClient, ascApiKeyId);
}
function convertUserRoleToGraphqlType(userRole) {
    switch (userRole) {
        case apple_utils_1.UserRole.ADMIN:
            return generated_1.AppStoreConnectUserRole.Admin;
        case apple_utils_1.UserRole.ACCESS_TO_REPORTS:
            return generated_1.AppStoreConnectUserRole.AccessToReports;
        case apple_utils_1.UserRole.ACCOUNT_HOLDER:
            return generated_1.AppStoreConnectUserRole.AccountHolder;
        case apple_utils_1.UserRole.APP_MANAGER:
            return generated_1.AppStoreConnectUserRole.AppManager;
        case apple_utils_1.UserRole.CLOUD_MANAGED_APP_DISTRIBUTION:
            return generated_1.AppStoreConnectUserRole.CloudManagedAppDistribution;
        case apple_utils_1.UserRole.CLOUD_MANAGED_DEVELOPER_ID:
            return generated_1.AppStoreConnectUserRole.CloudManagedDeveloperId;
        case apple_utils_1.UserRole.CREATE_APPS:
            return generated_1.AppStoreConnectUserRole.CreateApps;
        case apple_utils_1.UserRole.CUSTOMER_SUPPORT:
            return generated_1.AppStoreConnectUserRole.CustomerSupport;
        case apple_utils_1.UserRole.DEVELOPER:
            return generated_1.AppStoreConnectUserRole.Developer;
        case apple_utils_1.UserRole.FINANCE:
            return generated_1.AppStoreConnectUserRole.Finance;
        case apple_utils_1.UserRole.MARKETING:
            return generated_1.AppStoreConnectUserRole.Marketing;
        case apple_utils_1.UserRole.READ_ONLY:
            return generated_1.AppStoreConnectUserRole.ReadOnly;
        case apple_utils_1.UserRole.SALES:
            return generated_1.AppStoreConnectUserRole.Sales;
        case apple_utils_1.UserRole.TECHNICAL:
            return generated_1.AppStoreConnectUserRole.Technical;
    }
}
const formatProjectFullName = ({ account, projectName }) => `@${account.name}/${projectName}`;
