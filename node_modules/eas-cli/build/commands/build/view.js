"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const formatBuild_1 = require("../../build/utils/formatBuild");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const BuildQuery_1 = require("../../graphql/queries/BuildQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const ora_1 = require("../../ora");
const projectUtils_1 = require("../../project/projectUtils");
const json_1 = require("../../utils/json");
class BuildView extends EasCommand_1.default {
    static description = 'view a build for your project';
    static args = {
        BUILD_ID: core_1.Args.string({}),
    };
    static flags = {
        ...flags_1.EasJsonOnlyFlag,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        const { args: { BUILD_ID: buildId }, flags, } = await this.parse(BuildView);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(BuildView, {
            nonInteractive: true,
        });
        if (flags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const displayName = await (0, projectUtils_1.getDisplayNameForProjectIdAsync)(graphqlClient, projectId);
        const spinner = (0, ora_1.ora)().start('Fetching the build…');
        try {
            let build;
            if (buildId) {
                build = await BuildQuery_1.BuildQuery.byIdAsync(graphqlClient, buildId);
            }
            else {
                const builds = await BuildQuery_1.BuildQuery.viewBuildsOnAppAsync(graphqlClient, {
                    appId: projectId,
                    offset: 0,
                    limit: 1,
                });
                if (builds.length === 0) {
                    spinner.fail(`Couldn't find any builds for the project ${displayName}`);
                    return;
                }
                build = builds[0];
            }
            if (buildId) {
                spinner.succeed(`Found a matching build for the project ${displayName}`);
            }
            else {
                spinner.succeed(`Showing the last build for the project ${displayName}`);
            }
            if (flags.json) {
                (0, json_1.printJsonOnlyOutput)(build);
            }
            else {
                log_1.default.log(`\n${(0, formatBuild_1.formatGraphQLBuild)(build)}`);
            }
        }
        catch (err) {
            if (buildId) {
                spinner.fail(`Something went wrong and we couldn't fetch the build with id ${buildId}`);
            }
            else {
                spinner.fail(`Something went wrong and we couldn't fetch the last build for the project ${displayName}`);
            }
            throw err;
        }
    }
}
exports.default = BuildView;
