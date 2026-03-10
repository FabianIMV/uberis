"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadServerSideEnvironmentVariablesAsync = loadServerSideEnvironmentVariablesAsync;
const tslib_1 = require("tslib");
const EnvironmentVariablesQuery_1 = require("../../../graphql/queries/EnvironmentVariablesQuery");
const log_1 = tslib_1.__importDefault(require("../../../log"));
const cachedServerSideEnvironmentVariables = {};
async function loadServerSideEnvironmentVariablesAsync({ environment, projectId, graphqlClient, }) {
    // don't load environment variables if they were already loaded while executing a command
    const cachedEnvVarsForEnvironment = cachedServerSideEnvironmentVariables[environment];
    if (cachedEnvVarsForEnvironment) {
        return cachedEnvVarsForEnvironment;
    }
    const environmentVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdWithSensitiveAsync(graphqlClient, {
        appId: projectId,
        environment,
    });
    const serverEnvVars = Object.fromEntries(environmentVariables
        .filter(({ name, value }) => name && value)
        .map(({ name, value }) => [name, value]));
    if (Object.keys(serverEnvVars).length > 0) {
        log_1.default.log(`Environment variables with visibility "Plain text" and "Sensitive" loaded from the "${environment}" environment on EAS: ${Object.keys(serverEnvVars).join(', ')}.`);
    }
    else {
        log_1.default.log(`No environment variables with visibility "Plain text" and "Sensitive" found for the "${environment}" environment on EAS.`);
    }
    log_1.default.newLine();
    cachedServerSideEnvironmentVariables[environment] = serverEnvVars;
    return serverEnvVars;
}
