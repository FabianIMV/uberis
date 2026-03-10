"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const delete_1 = require("../../update/delete");
const json_1 = require("../../utils/json");
const pollForBackgroundJobReceiptAsync_1 = require("../../utils/pollForBackgroundJobReceiptAsync");
class UpdateDelete extends EasCommand_1.default {
    static description = 'delete all the updates in an update group';
    static args = {
        groupId: core_1.Args.string({
            required: true,
            description: 'The ID of an update group to delete.',
        }),
    };
    static flags = {
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args: { groupId: group }, flags, } = await this.parse(UpdateDelete);
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { loggedIn: { graphqlClient }, } = await this.getContextAsync(UpdateDelete, { nonInteractive });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        if (!nonInteractive) {
            const shouldContinue = await (0, prompts_1.confirmAsync)({
                message: `🚨${chalk_1.default.red('CAUTION')}🚨\n\n` +
                    `${chalk_1.default.yellow(`This will delete all of the updates in group "${group}".`)} ${chalk_1.default.red('This is a permanent operation.')}\n\n` +
                    `If you want to revert to a previous publish, you should use 'update --republish' targeted at the last working update group instead.\n\n` +
                    `An update group should only be deleted in an emergency like an accidental publish of a secret. In this case user 'update --republish' to revert to the last working update group first and then proceed with the deletion. Deleting an update group when it is the latest publish can lead to inconsistent caching behavior by clients.\n\n` +
                    `Would you like to continue?`,
            });
            if (!shouldContinue) {
                log_1.default.log('Aborted.');
                return;
            }
        }
        const receipt = await (0, delete_1.scheduleUpdateGroupDeletionAsync)(graphqlClient, { group });
        const successfulReceipt = await (0, pollForBackgroundJobReceiptAsync_1.pollForBackgroundJobReceiptAsync)(graphqlClient, receipt);
        log_1.default.debug('Deletion result', { successfulReceipt });
        if (jsonFlag) {
            (0, json_1.printJsonOnlyOutput)({ group });
        }
        else {
            log_1.default.withTick(`Deleted update group ${group}`);
        }
    }
}
exports.default = UpdateDelete;
