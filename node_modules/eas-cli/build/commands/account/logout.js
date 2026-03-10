"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const log_1 = tslib_1.__importDefault(require("../../log"));
class AccountLogout extends EasCommand_1.default {
    static description = 'log out';
    static aliases = ['logout'];
    static contextDefinition = {
        ...this.ContextOptions.SessionManagment,
    };
    async runAsync() {
        const { sessionManager } = await this.getContextAsync(AccountLogout, { nonInteractive: false });
        await sessionManager.logoutAsync();
        log_1.default.log('Logged out');
    }
}
exports.default = AccountLogout;
