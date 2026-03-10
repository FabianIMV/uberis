"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const queries_1 = require("../../branch/queries");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const pagination_1 = require("../../commandUtils/pagination");
const generated_1 = require("../../graphql/generated");
const platform_1 = require("../../platform");
const queries_2 = require("../../update/queries");
const json_1 = require("../../utils/json");
class UpdateList extends EasCommand_1.default {
    static description = 'view the recent updates';
    static flags = {
        branch: core_1.Flags.string({
            description: 'List updates only on this branch',
            exclusive: ['all'],
        }),
        all: core_1.Flags.boolean({
            description: 'List updates on all branches',
            exclusive: ['branch'],
            default: false,
        }),
        platform: core_1.Flags.option({
            options: Object.values(platform_1.RequestedPlatform),
            char: 'p',
            description: 'Filter updates by platform',
        })(),
        'runtime-version': core_1.Flags.string({
            description: 'Filter updates by runtime version',
        }),
        ...pagination_1.EasPaginatedQueryFlags,
        limit: (0, pagination_1.getLimitFlagWithCustomValues)({ defaultTo: 25, limit: 50 }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { flags } = await this.parse(UpdateList);
        const { branch: branchFlag, all, platform: requestedPlatform } = flags;
        const { json: jsonFlag, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(UpdateList, {
            nonInteractive,
        });
        const paginatedQueryOptions = (0, pagination_1.getPaginatedQueryOptions)(flags);
        if (jsonFlag) {
            (0, json_1.enableJsonOutput)();
        }
        // Build filter object
        const filter = {
            platform: toAppPlatform(requestedPlatform),
            runtimeVersions: flags['runtime-version'] ? [flags['runtime-version']] : undefined,
        };
        if (all) {
            await (0, queries_2.listAndRenderUpdateGroupsOnAppAsync)(graphqlClient, {
                projectId,
                filter,
                paginatedQueryOptions,
            });
        }
        else {
            if (branchFlag) {
                await (0, queries_2.listAndRenderUpdateGroupsOnBranchAsync)(graphqlClient, {
                    projectId,
                    branchName: branchFlag,
                    filter,
                    paginatedQueryOptions,
                });
            }
            else {
                const validationMessage = 'Branch name may not be empty.';
                if (nonInteractive) {
                    throw new Error(validationMessage);
                }
                const selectedBranch = await (0, queries_1.selectBranchOnAppAsync)(graphqlClient, {
                    projectId,
                    promptTitle: 'Which branch would you like to view?',
                    displayTextForListItem: updateBranch => ({
                        title: updateBranch.name,
                    }),
                    paginatedQueryOptions: 
                    // discard limit and offset because this query is not those flag's intended target
                    {
                        json: paginatedQueryOptions.json,
                        nonInteractive: paginatedQueryOptions.nonInteractive,
                        offset: 0,
                    },
                });
                await (0, queries_2.listAndRenderUpdateGroupsOnBranchAsync)(graphqlClient, {
                    projectId,
                    branchName: selectedBranch.name,
                    filter,
                    paginatedQueryOptions,
                });
            }
        }
    }
}
exports.default = UpdateList;
const toAppPlatform = (requestedPlatform) => {
    if (!requestedPlatform || requestedPlatform === platform_1.RequestedPlatform.All) {
        return undefined;
    }
    else if (requestedPlatform === platform_1.RequestedPlatform.Android) {
        return generated_1.AppPlatform.Android;
    }
    else {
        return generated_1.AppPlatform.Ios;
    }
};
