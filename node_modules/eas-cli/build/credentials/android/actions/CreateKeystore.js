"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateKeystore = void 0;
const tslib_1 = require("tslib");
const log_1 = tslib_1.__importDefault(require("../../../log"));
const promptForCredentials_1 = require("../../utils/promptForCredentials");
const credentials_1 = require("../credentials");
const keystore_1 = require("../utils/keystore");
const keystoreNew_1 = require("../utils/keystoreNew");
class CreateKeystore {
    account;
    constructor(account) {
        this.account = account;
    }
    async runAsync(ctx) {
        const projectId = await ctx.getProjectIdAsync();
        const keystore = await this.provideOrGenerateAsync(ctx.graphqlClient, ctx.analytics, projectId, ctx.nonInteractive);
        const keystoreFragment = await ctx.android.createKeystoreAsync(ctx.graphqlClient, this.account, keystore);
        log_1.default.succeed('Created keystore');
        return keystoreFragment;
    }
    async provideOrGenerateAsync(graphqlClient, analytics, projectId, nonInteractive = false) {
        if (!nonInteractive) {
            const providedKeystore = await (0, promptForCredentials_1.askForUserProvidedAsync)(credentials_1.keystoreSchema);
            if (providedKeystore) {
                const providedKeystoreWithType = (0, keystoreNew_1.getKeystoreWithType)(providedKeystore);
                (0, keystoreNew_1.validateKeystore)(providedKeystoreWithType);
                return providedKeystoreWithType;
            }
        }
        return await (0, keystore_1.generateRandomKeystoreAsync)(graphqlClient, analytics, projectId);
    }
}
exports.CreateKeystore = CreateKeystore;
