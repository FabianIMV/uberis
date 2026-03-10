"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const assert_1 = tslib_1.__importDefault(require("assert"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const queries_1 = require("../../branch/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const PublishMutation_1 = require("../../graphql/mutations/PublishMutation");
const UpdateQuery_1 = require("../../graphql/queries/UpdateQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const queries_2 = require("../../update/queries");
const utils_1 = require("../../update/utils");
const json_1 = require("../../utils/json");
class UpdateEdit extends EasCommand_1.default {
    static description = 'edit all the updates in an update group';
    static args = {
        groupId: core_1.Args.string({
            description: 'The ID of an update group to edit.',
        }),
    };
    static flags = {
        'rollout-percentage': core_1.Flags.integer({
            description: `Rollout percentage to set for a rollout update. The specified number must be an integer between 1 and 100.`,
            required: false,
            min: 0,
            max: 100,
        }),
        branch: core_1.Flags.string({
            description: 'Branch for which to list updates to select from',
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args: { groupId: maybeGroupId }, flags, } = await this.parse(UpdateEdit);
        const { 'rollout-percentage': rolloutPercentage, branch: branchFlag } = flags;
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(UpdateEdit, { nonInteractive });
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        let groupId = maybeGroupId;
        if (!groupId) {
            let branch = branchFlag;
            if (!branch) {
                const validationMessage = 'Branch name may not be empty.';
                if (nonInteractive) {
                    throw new Error(validationMessage);
                }
                const selectedBranch = await (0, queries_1.selectBranchOnAppAsync)(graphqlClient, {
                    projectId,
                    promptTitle: 'On which branch would you like search for an update to edit?',
                    displayTextForListItem: updateBranch => ({
                        title: updateBranch.name,
                    }),
                    paginatedQueryOptions: {
                        json: jsonFlag,
                        nonInteractive,
                        offset: 0,
                    },
                });
                branch = selectedBranch.name;
            }
            const selectedUpdateGroup = await (0, queries_2.selectUpdateGroupOnBranchAsync)(graphqlClient, {
                projectId,
                branchName: branch,
                paginatedQueryOptions: {
                    json: jsonFlag,
                    nonInteractive,
                    offset: 0,
                },
            });
            groupId = selectedUpdateGroup[0].group;
        }
        const proposedUpdatesToEdit = (await UpdateQuery_1.UpdateQuery.viewUpdateGroupAsync(graphqlClient, { groupId })).map(u => ({ updateId: u.id, rolloutPercentage: u.rolloutPercentage }));
        const updatesToEdit = proposedUpdatesToEdit.filter((u) => u.rolloutPercentage !== null && u.rolloutPercentage !== undefined);
        if (updatesToEdit.length === 0) {
            throw new Error('Cannot edit rollout percentage on update group that is not a rollout.');
        }
        const rolloutPercentagesSet = new Set(updatesToEdit.map(u => u.rolloutPercentage));
        if (rolloutPercentagesSet.size !== 1) {
            throw new Error('Cannot edit rollout percentage for a group with non-equal percentages for updates in the group.');
        }
        const previousPercentage = updatesToEdit[0].rolloutPercentage;
        if (nonInteractive && rolloutPercentage === undefined) {
            throw new Error('Must specify --rollout-percentage in non-interactive mode');
        }
        let rolloutPercentageToSet = rolloutPercentage;
        if (rolloutPercentageToSet === undefined) {
            const { percentage } = await (0, prompts_1.promptAsync)({
                type: 'number',
                message: `New rollout percentage (min: ${previousPercentage}, max: 100)`,
                validate: value => {
                    if (value <= previousPercentage) {
                        return `Rollout percentage must be greater than previous rollout percentage (${previousPercentage})`;
                    }
                    else if (value > 100) {
                        return `Rollout percentage must not be greater than 100`;
                    }
                    else {
                        return true;
                    }
                },
                name: 'percentage',
            });
            if (!percentage) {
                log_1.default.log('Aborted.');
                return;
            }
            rolloutPercentageToSet = percentage;
        }
        (0, assert_1.default)(rolloutPercentageToSet !== undefined);
        if (rolloutPercentageToSet < previousPercentage) {
            throw new Error(`Rollout percentage must be greater than previous rollout percentage (${previousPercentage})`);
        }
        else if (rolloutPercentageToSet > 100) {
            throw new Error('Rollout percentage must not be greater than 100');
        }
        const updatedUpdates = await Promise.all(updatesToEdit.map(async (u) => {
            return await PublishMutation_1.PublishMutation.setRolloutPercentageAsync(graphqlClient, u.updateId, rolloutPercentageToSet);
        }));
        if (jsonFlag) {
            (0, json_1.printJsonOnlyOutput)((0, utils_1.getUpdateJsonInfosForUpdates)(updatedUpdates));
        }
        else {
            const [updateGroupDescription] = (0, utils_1.getUpdateGroupDescriptions)([updatedUpdates]);
            log_1.default.log(chalk_1.default.bold('Update group:'));
            log_1.default.log((0, utils_1.formatUpdateGroup)(updateGroupDescription));
        }
    }
}
exports.default = UpdateEdit;
