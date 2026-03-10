"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const client_1 = require("../../graphql/client");
const log_1 = tslib_1.__importDefault(require("../../log"));
const projectUtils_1 = require("../../project/projectUtils");
const prompts_1 = require("../../prompts");
const json_1 = require("../../utils/json");
async function renameUpdateBranchOnAppAsync(graphqlClient, { appId, name, newName }) {
    const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
        .mutation((0, graphql_tag_1.default) `
          mutation EditUpdateBranch($input: EditUpdateBranchInput!) {
            updateBranch {
              editUpdateBranch(input: $input) {
                id
                name
              }
            }
          }
        `, {
        input: {
            appId,
            name,
            newName,
        },
    })
        .toPromise());
    return data.updateBranch.editUpdateBranch;
}
class BranchRename extends EasCommand_1.default {
    static description = 'rename a branch';
    static flags = {
        from: core_1.Flags.string({
            description: 'current name of the branch.',
            required: false,
        }),
        to: core_1.Flags.string({
            description: 'new name of the branch.',
            required: false,
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        let { flags: { from: currentName, to: newName, ...rawFlags }, } = await this.parse(BranchRename);
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(rawFlags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(BranchRename, {
            nonInteractive,
        });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        const projectDisplayName = await (0, projectUtils_1.getDisplayNameForProjectIdAsync)(graphqlClient, projectId);
        if (!currentName) {
            const validationMessage = 'current name may not be empty.';
            if (nonInteractive) {
                throw new Error(validationMessage);
            }
            ({ currentName } = await (0, prompts_1.promptAsync)({
                type: 'text',
                name: 'currentName',
                message: "Provide the name of the branch you'd like to rename:",
                validate: value => (value ? true : validationMessage),
            }));
        }
        if (!newName) {
            const validationMessage = 'new name may not be empty.';
            if (nonInteractive) {
                throw new Error(validationMessage);
            }
            ({ newName } = await (0, prompts_1.promptAsync)({
                type: 'text',
                name: 'newName',
                message: `Rename ${currentName}`,
                validate: value => (value ? true : validationMessage),
            }));
        }
        const editedBranch = await renameUpdateBranchOnAppAsync(graphqlClient, {
            appId: projectId,
            name: currentName,
            newName: newName,
        });
        if (jsonFlag) {
            (0, json_1.printJsonOnlyOutput)(editedBranch);
        }
        else {
            log_1.default.withTick(`️Renamed branch from ${currentName} to ${chalk_1.default.bold(editedBranch.name)} on project ${chalk_1.default.bold(projectDisplayName)}.`);
        }
    }
}
exports.default = BranchRename;
