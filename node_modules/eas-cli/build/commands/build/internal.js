"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const _1 = require(".");
const local_1 = require("../../build/local");
const runBuildAndSubmit_1 = require("../../build/runBuildAndSubmit");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const json_1 = require("../../utils/json");
const git_1 = tslib_1.__importDefault(require("../../vcs/clients/git"));
/**
 * This command will be run on the EAS Build workers, when building
 * directly from git. This command resolves credentials and other
 * build configuration, that normally would be included in the
 * job and metadata objects, and prints them to stdout.
 */
class BuildInternal extends EasCommand_1.default {
    static hidden = true;
    static flags = {
        platform: core_1.Flags.option({
            char: 'p',
            options: ['android', 'ios'],
            required: true,
        })(),
        profile: core_1.Flags.string({
            char: 'e',
            description: 'Name of the build profile from eas.json. Defaults to "production" if defined in eas.json.',
            helpValue: 'PROFILE_NAME',
        }),
        'auto-submit': core_1.Flags.boolean({
            default: false,
            description: 'Submit on build complete using the submit profile with the same name as the build profile',
            exclusive: ['auto-submit-with-profile'],
        }),
        'auto-submit-with-profile': core_1.Flags.string({
            description: 'Submit on build complete using the submit profile with provided name',
            helpValue: 'PROFILE_NAME',
            exclusive: ['auto-submit'],
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.ProjectDir,
        ...this.ContextOptions.Analytics,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        const { flags } = await this.parse(BuildInternal);
        // This command is always run with implicit --non-interactive and --json options
        (0, json_1.enableJsonOutput)();
        const { loggedIn: { actor, graphqlClient }, getDynamicPrivateProjectConfigAsync, projectDir, analytics, vcsClient, } = await this.getContextAsync(BuildInternal, {
            nonInteractive: true,
            withServerSideEnvironment: null,
        });
        if (vcsClient instanceof git_1.default) {
            // `build:internal` is run on EAS workers and the repo may have been changed
            // by pre-install hooks or other scripts. We don't want to require committing changes
            // to continue the build.
            vcsClient.requireCommit = false;
        }
        await (0, _1.handleDeprecatedEasJsonAsync)(projectDir, flags.nonInteractive);
        await (0, runBuildAndSubmit_1.runBuildAndSubmitAsync)({
            graphqlClient,
            analytics,
            vcsClient,
            projectDir,
            flags: {
                requestedPlatform: flags.platform,
                profile: flags.profile,
                nonInteractive: true,
                freezeCredentials: false,
                wait: false,
                clearCache: false,
                json: true,
                autoSubmit: flags['auto-submit'] || flags['auto-submit-with-profile'] !== undefined,
                localBuildOptions: {
                    localBuildMode: local_1.LocalBuildMode.INTERNAL,
                },
                submitProfile: flags['auto-submit-with-profile'] ?? flags.profile,
            },
            actor,
            getDynamicPrivateProjectConfigAsync,
        });
    }
}
exports.default = BuildInternal;
