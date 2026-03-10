"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const queries_1 = require("../../branch/queries");
const utils_1 = require("../../branch/utils");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const log_1 = tslib_1.__importDefault(require("../../log"));
const projectUtils_1 = require("../../project/projectUtils");
const prompts_1 = require("../../prompts");
const json_1 = require("../../utils/json");
class BranchCreate extends EasCommand_1.default {
    static description = 'create a branch';
    static args = {
        name: core_1.Args.string({
            required: false,
            description: 'Name of the branch to create',
        }),
    };
    static flags = {
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        let { args: { name }, flags, } = await this.parse(BranchCreate);
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, vcsClient, } = await this.getContextAsync(BranchCreate, {
            nonInteractive,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        const projectDisplayName = await (0, projectUtils_1.getDisplayNameForProjectIdAsync)(graphqlClient, projectId);
        if (!name) {
            const validationMessage = 'Branch name may not be empty.';
            if (nonInteractive) {
                throw new Error(validationMessage);
            }
            ({ name } = await (0, prompts_1.promptAsync)({
                type: 'text',
                name: 'name',
                message: 'Provide a branch name:',
                initial: (await (0, utils_1.getDefaultBranchNameAsync)(vcsClient)) ?? undefined,
                validate: value => (value ? true : validationMessage),
            }));
            if (!name) {
                throw new Error(validationMessage);
            }
        }
        const newBranch = await (0, queries_1.createUpdateBranchOnAppAsync)(graphqlClient, { appId: projectId, name });
        if (jsonFlag) {
            (0, json_1.printJsonOnlyOutput)(newBranch);
        }
        else {
            log_1.default.withTick(`️Created a new branch: ${chalk_1.default.bold(newBranch.name)} on project ${chalk_1.default.bold(projectDisplayName)}.`);
        }
    }
}
exports.default = BranchCreate;
