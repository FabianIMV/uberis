"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const AppQuery_1 = require("../../graphql/queries/AppQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const formatFields_1 = tslib_1.__importDefault(require("../../utils/formatFields"));
const json_1 = require("../../utils/json");
class WorkflowList extends EasCommand_1.default {
    static hidden = true;
    static description = 'List workflows for the current project';
    static flags = {
        ...flags_1.EasJsonOnlyFlag,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags } = await this.parse(WorkflowList);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(WorkflowList, {
            nonInteractive: true,
        });
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const workflows = await AppQuery_1.AppQuery.byIdWorkflowsAsync(graphqlClient, projectId);
        const result = workflows.map(workflow => ({
            id: workflow.id,
            name: workflow.name,
            fileName: workflow.fileName,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
        }));
        if (flags.json) {
            (0, json_1.printJsonOnlyOutput)(result);
            return;
        }
        log_1.default.addNewLineIfNone();
        result.forEach(workflow => {
            log_1.default.log((0, formatFields_1.default)([
                { label: 'ID', value: workflow.id },
                { label: 'Name', value: workflow.name ?? '-' },
                { label: 'File name', value: workflow.fileName },
                { label: 'Created At', value: workflow.createdAt },
                { label: 'Updated At', value: workflow.updatedAt },
            ]));
            log_1.default.addNewLineIfNone();
        });
    }
}
exports.default = WorkflowList;
