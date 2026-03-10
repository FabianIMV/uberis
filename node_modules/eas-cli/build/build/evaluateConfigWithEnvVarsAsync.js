"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateConfigWithEnvVarsAsync = evaluateConfigWithEnvVarsAsync;
const tslib_1 = require("tslib");
const environment_1 = require("./utils/environment");
const EnvironmentVariablesQuery_1 = require("../graphql/queries/EnvironmentVariablesQuery");
const log_1 = tslib_1.__importStar(require("../log"));
async function evaluateConfigWithEnvVarsAsync({ buildProfile, buildProfileName, graphqlClient, getProjectConfig, opts, }) {
    if (!graphqlClient) {
        log_1.default.warn('An Expo user account is required to fetch environment variables.');
        const config = await getProjectConfig(opts);
        return { env: buildProfile.env ?? {}, ...config };
    }
    const { projectId } = await getProjectConfig({ env: buildProfile.env, ...opts });
    const env = await resolveEnvVarsAsync({
        buildProfile,
        buildProfileName,
        graphqlClient,
        projectId,
    });
    const config = await getProjectConfig({ ...opts, env });
    return { env, ...config };
}
async function resolveEnvVarsAsync({ buildProfile, buildProfileName, graphqlClient, projectId, }) {
    const environment = buildProfile.environment ??
        resolveSuggestedEnvironmentForBuildProfileConfiguration(buildProfile);
    try {
        const environmentVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdWithSensitiveAsync(graphqlClient, {
            appId: projectId,
            environment,
        });
        const serverEnvVars = Object.fromEntries(environmentVariables
            .filter(({ name, value }) => name && value)
            .map(({ name, value }) => [name, value]));
        if (Object.keys(serverEnvVars).length > 0) {
            log_1.default.log(`Environment variables with visibility "Plain text" and "Sensitive" loaded from the "${environment.toLowerCase()}" environment on EAS: ${Object.keys(serverEnvVars).join(', ')}.`);
        }
        else {
            log_1.default.log(`No environment variables with visibility "Plain text" and "Sensitive" found for the "${environment.toLowerCase()}" environment on EAS.`);
        }
        if (buildProfile.env && Object.keys(buildProfile.env).length > 0) {
            log_1.default.log(`Environment variables loaded from the "${buildProfileName}" build profile "env" configuration: ${buildProfile.env && Object.keys(buildProfile.env).join(', ')}.`);
        }
        if (buildProfile.env &&
            Object.keys(buildProfile.env).length > 0 &&
            Object.keys(serverEnvVars).length > 0) {
            const overlappingKeys = Object.keys(serverEnvVars).filter(key => buildProfile.env && Object.keys(buildProfile.env).includes(key));
            if (overlappingKeys.length > 0) {
                log_1.default.warn(`The following environment variables are defined in both the "${buildProfileName}" build profile "env" configuration and the "${environment.toLowerCase()}" environment on EAS: ${overlappingKeys.join(', ')}. The values from the build profile configuration will be used.`);
            }
        }
        log_1.default.newLine();
        return { ...serverEnvVars, ...buildProfile.env };
    }
    catch (e) {
        log_1.default.error(`Failed to pull env variables for environment ${environment} from EAS servers`);
        log_1.default.error(e);
        log_1.default.error('This can possibly be a bug in EAS/EAS CLI. Report it here: https://github.com/expo/eas-cli/issues');
        return { ...buildProfile.env };
    }
}
function resolveSuggestedEnvironmentForBuildProfileConfiguration(buildProfile) {
    const environment = buildProfile.distribution === 'store'
        ? environment_1.DefaultEnvironment.Production
        : buildProfile.developmentClient
            ? environment_1.DefaultEnvironment.Development
            : environment_1.DefaultEnvironment.Preview;
    log_1.default.log(`Resolved "${environment}" environment for the build. ${(0, log_1.learnMore)('https://docs.expo.dev/eas/environment-variables/#setting-the-environment-for-your-builds')}`);
    return environment;
}
