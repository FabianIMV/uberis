"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const SelectPlatform_1 = require("../../credentials/manager/SelectPlatform");
class Credentials extends EasCommand_1.default {
    static description = 'manage credentials';
    static flags = {
        platform: core_1.Flags.option({ char: 'p', options: ['android', 'ios'] })(),
    };
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.OptionalProjectConfig,
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.Analytics,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        const { flags } = await this.parse(Credentials);
        const { loggedIn: { actor, graphqlClient }, optionalPrivateProjectConfig: privateProjectConfig, getDynamicPrivateProjectConfigAsync, analytics, vcsClient, } = await this.getContextAsync(Credentials, {
            nonInteractive: false,
            withServerSideEnvironment: null,
        });
        await new SelectPlatform_1.SelectPlatform(actor, graphqlClient, vcsClient, analytics, privateProjectConfig ?? null, getDynamicPrivateProjectConfigAsync, flags.platform).runAsync();
    }
}
exports.default = Credentials;
