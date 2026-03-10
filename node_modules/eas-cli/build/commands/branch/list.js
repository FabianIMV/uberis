"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const queries_1 = require("../../branch/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const pagination_1 = require("../../commandUtils/pagination");
const json_1 = require("../../utils/json");
class BranchList extends EasCommand_1.default {
    static description = 'list all branches';
    static flags = {
        ...pagination_1.EasPaginatedQueryFlags,
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags } = await this.parse(BranchList);
        const { nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(BranchList, {
            nonInteractive,
        });
        const paginatedQueryOptions = (0, pagination_1.getPaginatedQueryOptions)(flags);
        if (paginatedQueryOptions.json) {
            (0, json_1.enableJsonOutput)();
        }
        await (0, queries_1.listAndRenderBranchesOnAppAsync)(graphqlClient, { projectId, paginatedQueryOptions });
    }
}
exports.default = BranchList;
