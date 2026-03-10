"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const delete_1 = require("../../branch/delete");
const queries_1 = require("../../branch/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const pagination_1 = require("../../commandUtils/pagination");
const client_1 = require("../../graphql/client");
const log_1 = tslib_1.__importDefault(require("../../log"));
const projectUtils_1 = require("../../project/projectUtils");
const prompts_1 = require("../../prompts");
const json_1 = require("../../utils/json");
const pollForBackgroundJobReceiptAsync_1 = require("../../utils/pollForBackgroundJobReceiptAsync");
async function getBranchInfoAsync(graphqlClient, { appId, name }) {
    const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
        .query((0, graphql_tag_1.default) `
          query GetBranchInfo($appId: String!, $name: String!) {
            app {
              byId(appId: $appId) {
                id
                updateBranchByName(name: $name) {
                  id
                  name
                }
              }
            }
          }
        `, {
        appId,
        name,
    }, { additionalTypenames: ['UpdateBranch'] })
        .toPromise());
    return data;
}
class BranchDelete extends EasCommand_1.default {
    static description = 'delete a branch';
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    static args = {
        name: core_1.Args.string({
            required: false,
            description: 'Name of the branch to delete',
        }),
    };
    static flags = {
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    async runAsync() {
        let { args: { name: branchName }, flags, } = await this.parse(BranchDelete);
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const paginatedQueryOptions = (0, pagination_1.getPaginatedQueryOptions)(flags);
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(BranchDelete, { nonInteractive });
        const projectDisplayName = await (0, projectUtils_1.getDisplayNameForProjectIdAsync)(graphqlClient, projectId);
        if (!branchName) {
            const validationMessage = 'branch name may not be empty.';
            if (nonInteractive) {
                throw new Error(validationMessage);
            }
            ({ name: branchName } = await (0, queries_1.selectBranchOnAppAsync)(graphqlClient, {
                projectId,
                displayTextForListItem: updateBranch => ({ title: updateBranch.name }),
                promptTitle: 'Which branch would you like to delete?',
                paginatedQueryOptions,
            }));
        }
        const data = await getBranchInfoAsync(graphqlClient, { appId: projectId, name: branchName });
        const branchId = data.app?.byId.updateBranchByName?.id;
        if (!branchId) {
            throw new Error(`Could not find branch ${branchName} on ${projectDisplayName}`);
        }
        if (!nonInteractive) {
            log_1.default.addNewLineIfNone();
            log_1.default.warn(`You are about to permanently delete branch: "${branchName}" and all of the updates published on it.` +
                `\nThis action is irreversible.`);
            log_1.default.newLine();
            const confirmed = await (0, prompts_1.toggleConfirmAsync)({ message: 'Are you sure you wish to proceed?' });
            if (!confirmed) {
                log_1.default.error(`Cancelled deletion of branch: "${branchName}".`);
                process.exit(1);
            }
        }
        const receipt = await (0, delete_1.scheduleBranchDeletionAsync)(graphqlClient, { branchId });
        const successfulReceipt = await (0, pollForBackgroundJobReceiptAsync_1.pollForBackgroundJobReceiptAsync)(graphqlClient, receipt);
        log_1.default.debug('Deletion result', { successfulReceipt });
        if (jsonFlag) {
            (0, json_1.printJsonOnlyOutput)({ id: branchId });
        }
        else {
            log_1.default.withTick(`️Deleted branch "${branchName}" and all of its updates on project ${chalk_1.default.bold(projectDisplayName)}.`);
        }
    }
}
exports.default = BranchDelete;
