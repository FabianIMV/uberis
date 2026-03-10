"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const queries_1 = require("../../branch/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const pagination_1 = require("../../commandUtils/pagination");
const queries_2 = require("../../update/queries");
const json_1 = require("../../utils/json");
class BranchView extends EasCommand_1.default {
    static description = 'view a branch';
    static args = {
        name: core_1.Args.string({
            required: false,
            description: 'Name of the branch to view',
        }),
    };
    static flags = {
        ...pagination_1.EasPaginatedQueryFlags,
        ...flags_1.EasNonInteractiveAndJsonFlags,
        limit: (0, pagination_1.getLimitFlagWithCustomValues)({ defaultTo: 25, limit: 50 }),
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        let { args: { name: branchName }, flags, } = await this.parse(BranchView);
        const { nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(BranchView, {
            nonInteractive,
        });
        const paginatedQueryOptions = (0, pagination_1.getPaginatedQueryOptions)(flags);
        if (paginatedQueryOptions.json) {
            (0, json_1.enableJsonOutput)();
        }
        if (!branchName) {
            if (nonInteractive) {
                throw new Error('Branch name may not be empty.');
            }
            ({ name: branchName } = await (0, queries_1.selectBranchOnAppAsync)(graphqlClient, {
                projectId,
                promptTitle: 'Which branch would you like to view?',
                displayTextForListItem: updateBranch => ({
                    title: updateBranch.name,
                }),
                // discard limit and offset because this query is not their intended target
                paginatedQueryOptions: {
                    json: paginatedQueryOptions.json,
                    nonInteractive,
                    offset: 0,
                },
            }));
        }
        await (0, queries_2.listAndRenderUpdateGroupsOnBranchAsync)(graphqlClient, {
            projectId,
            branchName,
            paginatedQueryOptions,
        });
    }
}
exports.default = BranchView;
