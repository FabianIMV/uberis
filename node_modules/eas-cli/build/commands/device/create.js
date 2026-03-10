"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const AppStoreApi_1 = tslib_1.__importDefault(require("../../credentials/ios/appstore/AppStoreApi"));
const context_1 = require("../../devices/context");
const manager_1 = tslib_1.__importDefault(require("../../devices/manager"));
class DeviceCreate extends EasCommand_1.default {
    static description = 'register new Apple Devices to use for internal distribution';
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.OptionalProjectConfig,
    };
    async runAsync() {
        // this command is interactive by design
        const { loggedIn: { actor, graphqlClient }, optionalPrivateProjectConfig: privateProjectConfig, } = await this.getContextAsync(DeviceCreate, {
            nonInteractive: false,
            withServerSideEnvironment: null,
        });
        const ctx = await (0, context_1.createContextAsync)({
            appStore: new AppStoreApi_1.default(),
            user: actor,
            graphqlClient,
            projectId: privateProjectConfig?.projectId,
        });
        const manager = new manager_1.default(ctx);
        await manager.createAsync();
    }
}
exports.default = DeviceCreate;
