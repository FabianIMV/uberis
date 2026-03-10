"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatProjectFullName = void 0;
exports.getAndroidAppCredentialsWithCommonFieldsAsync = getAndroidAppCredentialsWithCommonFieldsAsync;
exports.getAndroidAppBuildCredentialsListAsync = getAndroidAppBuildCredentialsListAsync;
exports.getLegacyAndroidAppCredentialsWithCommonFieldsAsync = getLegacyAndroidAppCredentialsWithCommonFieldsAsync;
exports.getLegacyAndroidAppBuildCredentialsAsync = getLegacyAndroidAppBuildCredentialsAsync;
exports.createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync = createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync;
exports.updateAndroidAppCredentialsAsync = updateAndroidAppCredentialsAsync;
exports.updateAndroidAppBuildCredentialsAsync = updateAndroidAppBuildCredentialsAsync;
exports.setDefaultAndroidAppBuildCredentialsAsync = setDefaultAndroidAppBuildCredentialsAsync;
exports.createAndroidAppBuildCredentialsAsync = createAndroidAppBuildCredentialsAsync;
exports.getDefaultAndroidAppBuildCredentialsAsync = getDefaultAndroidAppBuildCredentialsAsync;
exports.getAndroidAppBuildCredentialsByNameAsync = getAndroidAppBuildCredentialsByNameAsync;
exports.createOrUpdateAndroidAppBuildCredentialsByNameAsync = createOrUpdateAndroidAppBuildCredentialsByNameAsync;
exports.createOrUpdateDefaultIosAppBuildCredentialsAsync = createOrUpdateDefaultIosAppBuildCredentialsAsync;
exports.createKeystoreAsync = createKeystoreAsync;
exports.deleteKeystoreAsync = deleteKeystoreAsync;
exports.createFcmAsync = createFcmAsync;
exports.deleteFcmAsync = deleteFcmAsync;
exports.createGoogleServiceAccountKeyAsync = createGoogleServiceAccountKeyAsync;
exports.deleteGoogleServiceAccountKeyAsync = deleteGoogleServiceAccountKeyAsync;
exports.getGoogleServiceAccountKeysForAccountAsync = getGoogleServiceAccountKeysForAccountAsync;
const AndroidAppBuildCredentialsMutation_1 = require("./graphql/mutations/AndroidAppBuildCredentialsMutation");
const AndroidAppCredentialsMutation_1 = require("./graphql/mutations/AndroidAppCredentialsMutation");
const AndroidFcmMutation_1 = require("./graphql/mutations/AndroidFcmMutation");
const AndroidKeystoreMutation_1 = require("./graphql/mutations/AndroidKeystoreMutation");
const GoogleServiceAccountKeyMutation_1 = require("./graphql/mutations/GoogleServiceAccountKeyMutation");
const AndroidAppCredentialsQuery_1 = require("./graphql/queries/AndroidAppCredentialsQuery");
const GoogleServiceAccountKeyQuery_1 = require("./graphql/queries/GoogleServiceAccountKeyQuery");
const AppQuery_1 = require("../../../graphql/queries/AppQuery");
async function getAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams) {
    const { androidApplicationIdentifier } = appLookupParams;
    const projectFullName = (0, exports.formatProjectFullName)(appLookupParams);
    return await AndroidAppCredentialsQuery_1.AndroidAppCredentialsQuery.withCommonFieldsByApplicationIdentifierAsync(graphqlClient, projectFullName, {
        androidApplicationIdentifier,
        legacyOnly: false,
    });
}
async function getAndroidAppBuildCredentialsListAsync(graphqlClient, appLookupParams) {
    const appCredentials = await getAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams);
    return appCredentials?.androidAppBuildCredentialsList ?? [];
}
/* There is at most one set of legacy android app credentials associated with an Expo App */
async function getLegacyAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams) {
    const projectFullName = (0, exports.formatProjectFullName)(appLookupParams);
    return await AndroidAppCredentialsQuery_1.AndroidAppCredentialsQuery.withCommonFieldsByApplicationIdentifierAsync(graphqlClient, projectFullName, {
        legacyOnly: true,
    });
}
/* There is at most one set of legacy android app build credentials associated with an Expo App */
async function getLegacyAndroidAppBuildCredentialsAsync(graphqlClient, appLookupParams) {
    const legacyAppCredentials = await getLegacyAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams);
    return legacyAppCredentials?.androidAppBuildCredentialsList[0] ?? null;
}
async function createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync(graphqlClient, appLookupParams) {
    const maybeAndroidAppCredentials = await getAndroidAppCredentialsWithCommonFieldsAsync(graphqlClient, appLookupParams);
    if (maybeAndroidAppCredentials) {
        return maybeAndroidAppCredentials;
    }
    else {
        const app = await getAppAsync(graphqlClient, appLookupParams);
        return await AndroidAppCredentialsMutation_1.AndroidAppCredentialsMutation.createAndroidAppCredentialsAsync(graphqlClient, {}, app.id, appLookupParams.androidApplicationIdentifier);
    }
}
async function updateAndroidAppCredentialsAsync(graphqlClient, appCredentials, { androidFcmId, googleServiceAccountKeyForSubmissionsId, googleServiceAccountKeyForFcmV1Id, }) {
    let updatedAppCredentials = appCredentials;
    if (androidFcmId) {
        updatedAppCredentials = await AndroidAppCredentialsMutation_1.AndroidAppCredentialsMutation.setFcmKeyAsync(graphqlClient, appCredentials.id, androidFcmId);
    }
    if (googleServiceAccountKeyForSubmissionsId) {
        updatedAppCredentials =
            await AndroidAppCredentialsMutation_1.AndroidAppCredentialsMutation.setGoogleServiceAccountKeyForSubmissionsAsync(graphqlClient, appCredentials.id, googleServiceAccountKeyForSubmissionsId);
    }
    if (googleServiceAccountKeyForFcmV1Id) {
        updatedAppCredentials =
            await AndroidAppCredentialsMutation_1.AndroidAppCredentialsMutation.setGoogleServiceAccountKeyForFcmV1Async(graphqlClient, appCredentials.id, googleServiceAccountKeyForFcmV1Id);
    }
    return updatedAppCredentials;
}
async function updateAndroidAppBuildCredentialsAsync(graphqlClient, buildCredentials, { androidKeystoreId, }) {
    return await AndroidAppBuildCredentialsMutation_1.AndroidAppBuildCredentialsMutation.setKeystoreAsync(graphqlClient, buildCredentials.id, androidKeystoreId);
}
async function setDefaultAndroidAppBuildCredentialsAsync(graphqlClient, buildCredentials) {
    return await AndroidAppBuildCredentialsMutation_1.AndroidAppBuildCredentialsMutation.setDefaultAndroidAppBuildCredentialsAsync(graphqlClient, buildCredentials.id);
}
async function createAndroidAppBuildCredentialsAsync(graphqlClient, appLookupParams, { name, isDefault, androidKeystoreId, }) {
    const androidAppCredentials = await createOrGetExistingAndroidAppCredentialsWithBuildCredentialsAsync(graphqlClient, appLookupParams);
    return await AndroidAppBuildCredentialsMutation_1.AndroidAppBuildCredentialsMutation.createAndroidAppBuildCredentialsAsync(graphqlClient, {
        name,
        isDefault,
        keystoreId: androidKeystoreId,
    }, androidAppCredentials.id);
}
async function getDefaultAndroidAppBuildCredentialsAsync(graphqlClient, appLookupParams) {
    const buildCredentialsList = await getAndroidAppBuildCredentialsListAsync(graphqlClient, appLookupParams);
    return buildCredentialsList.find(buildCredentials => buildCredentials.isDefault) ?? null;
}
async function getAndroidAppBuildCredentialsByNameAsync(graphqlClient, appLookupParams, name) {
    const buildCredentialsList = await getAndroidAppBuildCredentialsListAsync(graphqlClient, appLookupParams);
    return buildCredentialsList.find(buildCredentials => buildCredentials.name === name) ?? null;
}
async function createOrUpdateAndroidAppBuildCredentialsByNameAsync(graphqlClient, appLookupParams, name, { androidKeystoreId, }) {
    const existingBuildCredentialsWithName = await getAndroidAppBuildCredentialsByNameAsync(graphqlClient, appLookupParams, name);
    if (existingBuildCredentialsWithName) {
        return await updateAndroidAppBuildCredentialsAsync(graphqlClient, existingBuildCredentialsWithName, {
            androidKeystoreId,
        });
    }
    const defaultBuildCredentialsExist = !!(await getDefaultAndroidAppBuildCredentialsAsync(graphqlClient, appLookupParams));
    return await createAndroidAppBuildCredentialsAsync(graphqlClient, appLookupParams, {
        name,
        isDefault: !defaultBuildCredentialsExist, // make default if none exist
        androidKeystoreId,
    });
}
async function createOrUpdateDefaultIosAppBuildCredentialsAsync() {
    throw new Error('This requires user prompting. Look for me in BuildCredentialsUtils');
}
async function createKeystoreAsync(graphqlClient, account, keystore) {
    return await AndroidKeystoreMutation_1.AndroidKeystoreMutation.createAndroidKeystoreAsync(graphqlClient, {
        base64EncodedKeystore: keystore.keystore,
        keystorePassword: keystore.keystorePassword,
        keyAlias: keystore.keyAlias,
        keyPassword: keystore.keyPassword,
    }, account.id);
}
async function deleteKeystoreAsync(graphqlClient, keystore) {
    await AndroidKeystoreMutation_1.AndroidKeystoreMutation.deleteAndroidKeystoreAsync(graphqlClient, keystore.id);
}
async function createFcmAsync(graphqlClient, account, fcmApiKey, version) {
    return await AndroidFcmMutation_1.AndroidFcmMutation.createAndroidFcmAsync(graphqlClient, { credential: fcmApiKey, version }, account.id);
}
async function deleteFcmAsync(graphqlClient, fcm) {
    await AndroidFcmMutation_1.AndroidFcmMutation.deleteAndroidFcmAsync(graphqlClient, fcm.id);
}
async function createGoogleServiceAccountKeyAsync(graphqlClient, account, jsonKey) {
    return await GoogleServiceAccountKeyMutation_1.GoogleServiceAccountKeyMutation.createGoogleServiceAccountKeyAsync(graphqlClient, { jsonKey }, account.id);
}
async function deleteGoogleServiceAccountKeyAsync(graphqlClient, googleServiceAccountKey) {
    await GoogleServiceAccountKeyMutation_1.GoogleServiceAccountKeyMutation.deleteGoogleServiceAccountKeyAsync(graphqlClient, googleServiceAccountKey.id);
}
async function getGoogleServiceAccountKeysForAccountAsync(graphqlClient, account) {
    return await GoogleServiceAccountKeyQuery_1.GoogleServiceAccountKeyQuery.getAllForAccountAsync(graphqlClient, account.name);
}
async function getAppAsync(graphqlClient, appLookupParams) {
    const projectFullName = (0, exports.formatProjectFullName)(appLookupParams);
    return await AppQuery_1.AppQuery.byFullNameAsync(graphqlClient, projectFullName);
}
const formatProjectFullName = ({ account, projectName }) => `@${account.name}/${projectName}`;
exports.formatProjectFullName = formatProjectFullName;
