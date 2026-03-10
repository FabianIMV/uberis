"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicPrivateProjectConfigContextField = exports.DynamicPublicProjectConfigContextField = void 0;
const tslib_1 = require("tslib");
const ContextField_1 = tslib_1.__importDefault(require("./ContextField"));
const createGraphqlClient_1 = require("./contextUtils/createGraphqlClient");
const findProjectDirAndVerifyProjectSetupAsync_1 = require("./contextUtils/findProjectDirAndVerifyProjectSetupAsync");
const getProjectIdAsync_1 = require("./contextUtils/getProjectIdAsync");
const loadServerSideEnvironmentVariablesAsync_1 = require("./contextUtils/loadServerSideEnvironmentVariablesAsync");
const expoConfig_1 = require("../../project/expoConfig");
class DynamicPublicProjectConfigContextField extends ContextField_1.default {
    async getValueAsync({ nonInteractive, sessionManager, withServerSideEnvironment, }) {
        const projectDir = await (0, findProjectDirAndVerifyProjectSetupAsync_1.findProjectDirAndVerifyProjectSetupAsync)();
        return async (options) => {
            const expBefore = await (0, expoConfig_1.getPublicExpoConfigAsync)(projectDir, options);
            const projectId = await (0, getProjectIdAsync_1.getProjectIdAsync)(sessionManager, expBefore, {
                nonInteractive,
                env: options?.env,
            });
            if (withServerSideEnvironment) {
                const { authenticationInfo } = await sessionManager.ensureLoggedInAsync({
                    nonInteractive,
                });
                const graphqlClient = (0, createGraphqlClient_1.createGraphqlClient)(authenticationInfo);
                const serverSideEnvironmentVariables = await (0, loadServerSideEnvironmentVariablesAsync_1.loadServerSideEnvironmentVariablesAsync)({
                    environment: withServerSideEnvironment,
                    projectId,
                    graphqlClient,
                });
                options = {
                    ...options,
                    env: {
                        ...options?.env,
                        ...serverSideEnvironmentVariables,
                    },
                };
            }
            const exp = await (0, expoConfig_1.getPublicExpoConfigAsync)(projectDir, options);
            return {
                exp,
                projectDir,
                projectId,
            };
        };
    }
}
exports.DynamicPublicProjectConfigContextField = DynamicPublicProjectConfigContextField;
class DynamicPrivateProjectConfigContextField extends ContextField_1.default {
    async getValueAsync({ nonInteractive, sessionManager, withServerSideEnvironment, }) {
        const projectDir = await (0, findProjectDirAndVerifyProjectSetupAsync_1.findProjectDirAndVerifyProjectSetupAsync)();
        return async (options) => {
            const expBefore = await (0, expoConfig_1.getPrivateExpoConfigAsync)(projectDir, options);
            const projectId = await (0, getProjectIdAsync_1.getProjectIdAsync)(sessionManager, expBefore, {
                nonInteractive,
                env: options?.env,
            });
            if (withServerSideEnvironment) {
                const { authenticationInfo } = await sessionManager.ensureLoggedInAsync({
                    nonInteractive,
                });
                const graphqlClient = (0, createGraphqlClient_1.createGraphqlClient)(authenticationInfo);
                const serverSideEnvironmentVariables = await (0, loadServerSideEnvironmentVariablesAsync_1.loadServerSideEnvironmentVariablesAsync)({
                    environment: withServerSideEnvironment,
                    projectId,
                    graphqlClient,
                });
                options = {
                    ...options,
                    env: {
                        ...options?.env,
                        ...serverSideEnvironmentVariables,
                    },
                };
            }
            const exp = await (0, expoConfig_1.getPrivateExpoConfigAsync)(projectDir, options);
            return {
                exp,
                projectDir,
                projectId,
            };
        };
    }
}
exports.DynamicPrivateProjectConfigContextField = DynamicPrivateProjectConfigContextField;
