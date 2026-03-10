"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const queries_1 = require("../../channel/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const json_1 = require("../../utils/json");
class ChannelCreate extends EasCommand_1.default {
    static description = 'create a channel';
    static args = {
        name: core_1.Args.string({
            required: false,
            description: 'Name of the channel to create',
        }),
    };
    static flags = {
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        let { args: { name: channelName }, flags, } = await this.parse(ChannelCreate);
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(ChannelCreate, {
            nonInteractive,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        if (!channelName) {
            const validationMessage = 'Channel name may not be empty.';
            if (nonInteractive) {
                throw new Error(validationMessage);
            }
            ({ name: channelName } = await (0, prompts_1.promptAsync)({
                type: 'text',
                name: 'name',
                message: 'Provide a channel name:',
                validate: value => (value ? true : validationMessage),
            }));
            if (!channelName) {
                throw new Error(validationMessage);
            }
        }
        await (0, queries_1.createAndLinkChannelAsync)(graphqlClient, {
            appId: projectId,
            channelName,
            shouldPrintJson: jsonFlag,
        });
        log_1.default.addNewLineIfNone();
        log_1.default.log(chalk_1.default.bold('You can now update your app by publishing!'));
    }
}
exports.default = ChannelCreate;
