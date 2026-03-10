"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const User_1 = require("../../user/User");
class AccountLogin extends EasCommand_1.default {
    static description = 'log in with your Expo account';
    static aliases = ['login'];
    static flags = {
        // can pass either --sso or -s
        sso: core_1.Flags.boolean({
            description: 'Login with SSO',
            char: 's',
            default: false,
        }),
        browser: core_1.Flags.boolean({
            description: 'Login with your browser',
            char: 'b',
            default: false,
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.MaybeLoggedIn,
        ...this.ContextOptions.SessionManagment,
    };
    async runAsync() {
        const { flags: { sso, browser }, } = await this.parse(AccountLogin);
        const { sessionManager, maybeLoggedIn: { actor }, } = await this.getContextAsync(AccountLogin, { nonInteractive: false });
        if (sessionManager.getAccessToken()) {
            throw new Error('EXPO_TOKEN is set in your environment, and is being used for all EAS authentication. To use username/password authentication, unset EXPO_TOKEN in your environment and re-run the command.');
        }
        if (actor) {
            log_1.default.warn(`You are already logged in as ${chalk_1.default.bold((0, User_1.getActorDisplayName)(actor))}.`);
            const shouldContinue = await (0, prompts_1.confirmAsync)({
                message: 'Do you want to continue?',
            });
            if (!shouldContinue) {
                core_1.Errors.error('Aborted', { exit: 1 });
            }
        }
        await sessionManager.showLoginPromptAsync({ sso, browser });
        log_1.default.log('Logged in');
    }
}
exports.default = AccountLogin;
