"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const eas_json_1 = require("@expo/eas-json");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const configure_1 = require("../../build/configure");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const log_1 = tslib_1.__importStar(require("../../log"));
const platform_1 = require("../../platform");
const configure_2 = require("../../update/configure");
class UpdateConfigure extends EasCommand_1.default {
    static description = 'configure the project to support EAS Update';
    static flags = {
        platform: core_1.Flags.option({
            description: 'Platform to configure',
            char: 'p',
            options: Object.values(platform_1.RequestedPlatform),
            default: platform_1.RequestedPlatform.All,
        })(),
        ...flags_1.EasUpdateEnvironmentFlag,
        ...flags_1.EASNonInteractiveFlag,
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectConfig,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        const { flags } = await this.parse(UpdateConfigure);
        const { privateProjectConfig: { projectId, exp, projectDir }, vcsClient, } = await this.getContextAsync(UpdateConfigure, {
            nonInteractive: flags['non-interactive'],
            withServerSideEnvironment: flags['environment'] ?? null,
        });
        log_1.default.log('💡 The following process will configure your project to use EAS Update. These changes only apply to your local project files and you can safely revert them at any time.');
        await vcsClient.ensureRepoExistsAsync();
        const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
        const easJsonCliConfig = (await eas_json_1.EasJsonUtils.getCliConfigAsync(easJsonAccessor)) ?? {};
        await (0, configure_2.ensureEASUpdateIsConfiguredAsync)({
            exp,
            projectId,
            projectDir,
            platform: flags['platform'],
            vcsClient,
            env: undefined,
            forceNativeConfigSync: true,
            manifestHostOverride: easJsonCliConfig.updateManifestHostOverride ?? null,
        });
        await (0, configure_2.ensureEASUpdateIsConfiguredInEasJsonAsync)(projectDir);
        log_1.default.addNewLineIfNone();
        log_1.default.log(`🎉 Your app is configured to use EAS Update!`);
        log_1.default.newLine();
        const easJsonExists = await (0, configure_1.easJsonExistsAsync)(projectDir);
        if (!easJsonExists) {
            log_1.default.log(`- Run ${chalk_1.default.bold('eas build:configure')} to complete your installation`);
        }
        log_1.default.log(`- ${(0, log_1.learnMore)('https://docs.expo.dev/eas-update/introduction/', {
            learnMoreMessage: 'Learn more about other capabilities of EAS Update',
        })}`);
    }
}
exports.default = UpdateConfigure;
