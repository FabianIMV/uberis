"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const generated_1 = require("../../graphql/generated");
const log_1 = tslib_1.__importDefault(require("../../log"));
const User_1 = require("../../user/User");
class AccountView extends EasCommand_1.default {
    static description = 'show the username you are logged in as';
    static aliases = ['whoami'];
    static contextDefinition = {
        ...this.ContextOptions.MaybeLoggedIn,
    };
    async runAsync() {
        const { maybeLoggedIn: { actor, authenticationInfo }, } = await this.getContextAsync(AccountView, { nonInteractive: true });
        if (actor) {
            const displayName = (0, User_1.getActorDisplayName)(actor);
            const loggedInAs = authenticationInfo.accessToken
                ? `${displayName} (authenticated using EXPO_TOKEN)`
                : displayName;
            log_1.default.log(chalk_1.default.green(loggedInAs));
            if ('email' in actor) {
                log_1.default.log(actor.email);
            }
            // personal account is included, only show if more accounts that personal account
            // but do show personal account in list if there are more
            const accountExcludingPersonalAccount = actor.accounts.filter(account => !('username' in actor) || account.name !== actor.username);
            if (accountExcludingPersonalAccount.length > 0) {
                log_1.default.newLine();
                log_1.default.log('Accounts:');
                actor.accounts.forEach(account => {
                    const roleOnAccount = AccountView.getRoleOnAccount(actor, account);
                    log_1.default.log(`• ${account.name} (Role: ${AccountView.getLabelForRole(roleOnAccount)})`);
                });
            }
        }
        else {
            log_1.default.warn('Not logged in');
            process.exit(1);
        }
    }
    static getRoleOnAccount(actor, account) {
        if ('username' in actor && account.name === actor.username) {
            return generated_1.Role.Owner;
        }
        return (0, nullthrows_1.default)(account.users.find(user => user.actor.id === actor.id)?.role);
    }
    static getLabelForRole(role) {
        switch (role) {
            case generated_1.Role.Owner:
                return 'Owner';
            case generated_1.Role.Admin:
                return 'Admin';
            case generated_1.Role.Developer:
                return 'Developer';
            case generated_1.Role.ViewOnly:
                return 'Viewer';
            case generated_1.Role.Custom:
            case generated_1.Role.HasAdmin:
            case generated_1.Role.NotAdmin:
                return 'Custom';
        }
    }
}
exports.default = AccountView;
