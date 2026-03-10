"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUNTIME_VERSIONS_LIMIT = exports.UPDATE_GROUPS_LIMIT = exports.UPDATES_LIMIT = void 0;
exports.listAndRenderUpdateGroupsOnAppAsync = listAndRenderUpdateGroupsOnAppAsync;
exports.listAndRenderUpdateGroupsOnBranchAsync = listAndRenderUpdateGroupsOnBranchAsync;
exports.selectRuntimeAndGetLatestUpdateGroupForEachPublishPlatformOnBranchAsync = selectRuntimeAndGetLatestUpdateGroupForEachPublishPlatformOnBranchAsync;
exports.selectUpdateGroupOnBranchAsync = selectUpdateGroupOnBranchAsync;
exports.selectRuntimeOnBranchAsync = selectRuntimeOnBranchAsync;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const utils_1 = require("./utils");
const generated_1 = require("../graphql/generated");
const RuntimeQuery_1 = require("../graphql/queries/RuntimeQuery");
const UpdateQuery_1 = require("../graphql/queries/UpdateQuery");
const log_1 = tslib_1.__importDefault(require("../log"));
const formatFields_1 = tslib_1.__importDefault(require("../utils/formatFields"));
const json_1 = require("../utils/json");
const queries_1 = require("../utils/queries");
const relay_1 = require("../utils/relay");
exports.UPDATES_LIMIT = 50;
exports.UPDATE_GROUPS_LIMIT = 25;
exports.RUNTIME_VERSIONS_LIMIT = 25;
async function listAndRenderUpdateGroupsOnAppAsync(graphqlClient, { projectId, filter, paginatedQueryOptions, }) {
    if (paginatedQueryOptions.nonInteractive) {
        const updateGroups = await queryUpdateGroupsOnAppAsync(graphqlClient, {
            limit: paginatedQueryOptions.limit ?? exports.UPDATE_GROUPS_LIMIT,
            offset: paginatedQueryOptions.offset,
            appId: projectId,
            filter,
        });
        renderUpdateGroupsOnApp({ updateGroups, paginatedQueryOptions });
    }
    else {
        await (0, queries_1.paginatedQueryWithConfirmPromptAsync)({
            limit: paginatedQueryOptions.limit ?? exports.UPDATE_GROUPS_LIMIT,
            offset: paginatedQueryOptions.offset,
            queryToPerform: (limit, offset) => queryUpdateGroupsOnAppAsync(graphqlClient, { limit, offset, appId: projectId, filter }),
            promptOptions: {
                title: 'Load more update groups?',
                renderListItems: updateGroups => {
                    renderUpdateGroupsOnApp({ updateGroups, paginatedQueryOptions });
                },
            },
        });
    }
}
async function listAndRenderUpdateGroupsOnBranchAsync(graphqlClient, { projectId, branchName, filter, paginatedQueryOptions, }) {
    if (paginatedQueryOptions.nonInteractive) {
        const updateGroups = await queryUpdateGroupsOnBranchAsync(graphqlClient, {
            limit: paginatedQueryOptions.limit ?? exports.UPDATE_GROUPS_LIMIT,
            offset: paginatedQueryOptions.offset,
            appId: projectId,
            branchName,
            filter,
        });
        renderUpdateGroupsOnBranch({ updateGroups, branchName, paginatedQueryOptions });
    }
    else {
        await (0, queries_1.paginatedQueryWithConfirmPromptAsync)({
            limit: paginatedQueryOptions.limit ?? exports.UPDATE_GROUPS_LIMIT,
            offset: paginatedQueryOptions.offset,
            queryToPerform: (limit, offset) => queryUpdateGroupsOnBranchAsync(graphqlClient, {
                limit,
                offset,
                appId: projectId,
                branchName,
                filter,
            }),
            promptOptions: {
                title: 'Load more update groups?',
                renderListItems: updateGroups => {
                    renderUpdateGroupsOnBranch({ updateGroups, branchName, paginatedQueryOptions });
                },
            },
        });
    }
}
async function selectRuntimeAndGetLatestUpdateGroupForEachPublishPlatformOnBranchAsync(graphqlClient, { projectId, branchName, paginatedQueryOptions, }) {
    if (paginatedQueryOptions.nonInteractive) {
        const runtimes = await RuntimeQuery_1.RuntimeQuery.getRuntimesOnBranchAsync(graphqlClient, {
            appId: projectId,
            name: branchName,
            first: exports.RUNTIME_VERSIONS_LIMIT,
        });
        if (runtimes.edges.length === 0) {
            throw new Error(`No runtime versions found on branch "${branchName}".`);
        }
        const runtimeList = runtimes.edges.map(e => e.node.version).join('\n  ');
        throw new Error(`Unable to select a runtime in non-interactive mode. Available runtime versions on branch "${branchName}":\n  ${runtimeList}`);
    }
    const runtimeVersion = await selectRuntimeOnBranchAsync(graphqlClient, {
        appId: projectId,
        branchName,
    });
    if (!runtimeVersion) {
        throw new Error('No runtime version selected.');
    }
    return {
        ios: (await queryUpdateGroupsOnBranchAsync(graphqlClient, {
            appId: projectId,
            branchName,
            limit: 1,
            offset: 0,
            filter: {
                runtimeVersions: [runtimeVersion.version],
                platform: generated_1.AppPlatform.Ios,
            },
        }))[0],
        android: (await queryUpdateGroupsOnBranchAsync(graphqlClient, {
            appId: projectId,
            branchName,
            limit: 1,
            offset: 0,
            filter: {
                runtimeVersions: [runtimeVersion.version],
                platform: generated_1.AppPlatform.Android,
            },
        }))[0],
    };
}
async function selectUpdateGroupOnBranchAsync(graphqlClient, { projectId, branchName, paginatedQueryOptions, }) {
    if (paginatedQueryOptions.nonInteractive) {
        const updateGroups = await queryUpdateGroupsOnBranchAsync(graphqlClient, {
            appId: projectId,
            branchName,
            limit: paginatedQueryOptions.limit ?? exports.UPDATE_GROUPS_LIMIT,
            offset: paginatedQueryOptions.offset,
        });
        if (updateGroups.length === 0) {
            throw new Error(`No update groups found on branch "${branchName}".`);
        }
        const updateList = updateGroups
            .map(group => {
            const first = group[0];
            return first
                ? `${first.group} (runtime: ${first.runtimeVersion}, message: ${first.message ?? 'N/A'})`
                : 'unknown';
        })
            .join('\n  ');
        throw new Error(`Unable to select an update in non-interactive mode. Use the --group flag to specify the update group. Available update groups on branch "${branchName}":\n  ${updateList}`);
    }
    const updateGroup = await (0, queries_1.paginatedQueryWithSelectPromptAsync)({
        limit: paginatedQueryOptions.limit ?? exports.UPDATE_GROUPS_LIMIT,
        offset: paginatedQueryOptions.offset,
        queryToPerform: (limit, offset) => queryUpdateGroupsOnBranchAsync(graphqlClient, {
            appId: projectId,
            branchName,
            limit,
            offset,
        }),
        promptOptions: {
            title: 'Load more update groups?',
            makePartialChoiceObject: updateGroup => ({
                title: (0, utils_1.formatUpdateTitle)(updateGroup[0]),
            }),
            getIdentifierForQueryItem: updateGroup => updateGroup[0].group,
        },
    });
    if (!updateGroup || updateGroup.length === 0) {
        throw new Error(`Could not find any branches for project "${projectId}"`);
    }
    return updateGroup;
}
async function queryUpdateGroupsOnBranchAsync(graphqlClient, args) {
    return await UpdateQuery_1.UpdateQuery.viewUpdateGroupsOnBranchAsync(graphqlClient, args);
}
async function queryUpdateGroupsOnAppAsync(graphqlClient, args) {
    return await UpdateQuery_1.UpdateQuery.viewUpdateGroupsOnAppAsync(graphqlClient, args);
}
function renderUpdateGroupsOnBranch({ branchName, updateGroups, paginatedQueryOptions: { json }, }) {
    // Ensure all updates are from the same branch
    const branchNames = updateGroups.flatMap(updateGroup => updateGroup.map(update => update.branch.name));
    (0, assert_1.default)(branchNames.every(name => name === branchName), 'Each update must belong to the same branch.');
    const updateGroupDescriptions = (0, utils_1.getUpdateGroupDescriptionsWithBranch)(updateGroups);
    const branch = {
        name: branchName,
        id: updateGroups[0]?.[0].branch.id ?? 'N/A',
    };
    if (json) {
        (0, json_1.printJsonOnlyOutput)({ ...branch, currentPage: updateGroupDescriptions });
        return;
    }
    log_1.default.addNewLineIfNone();
    log_1.default.log(chalk_1.default.bold('Branch:'));
    log_1.default.log((0, formatFields_1.default)([
        { label: 'Name', value: branch.name },
        { label: 'ID', value: branch.id },
    ]));
    log_1.default.newLine();
    log_1.default.log(chalk_1.default.bold('Recent update groups:'));
    log_1.default.newLine();
    log_1.default.log(updateGroupDescriptions
        .map(description => (0, utils_1.formatUpdateGroup)(description))
        .join(`\n\n${chalk_1.default.dim('———')}\n\n`));
}
function renderUpdateGroupsOnApp({ updateGroups, paginatedQueryOptions: { json }, }) {
    const updateGroupDescriptions = (0, utils_1.getUpdateGroupDescriptionsWithBranch)(updateGroups);
    if (json) {
        (0, json_1.printJsonOnlyOutput)({ currentPage: updateGroupDescriptions });
    }
    log_1.default.addNewLineIfNone();
    log_1.default.log(chalk_1.default.bold('Recent update groups:'));
    log_1.default.newLine();
    log_1.default.log(updateGroupDescriptions
        .map(({ branch, ...update }) => (0, utils_1.formatBranch)({
        branch,
        update,
    }))
        .join(`\n\n${chalk_1.default.dim('———')}\n\n`));
}
async function selectRuntimeOnBranchAsync(graphqlClient, { appId, branchName, batchSize = 5, }) {
    const queryAsync = async (queryParams) => {
        return await RuntimeQuery_1.RuntimeQuery.getRuntimesOnBranchAsync(graphqlClient, {
            appId,
            name: branchName,
            first: queryParams.first,
            after: queryParams.after,
            last: queryParams.last,
            before: queryParams.before,
        });
    };
    const getTitleAsync = async (runtime) => {
        return runtime.version;
    };
    return await (0, relay_1.selectPaginatedAsync)({
        queryAsync,
        getTitleAsync,
        printedType: 'target runtime',
        pageSize: batchSize,
    });
}
