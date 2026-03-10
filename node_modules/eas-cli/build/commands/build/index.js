"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDeprecatedEasJsonAsync = handleDeprecatedEasJsonAsync;
const tslib_1 = require("tslib");
const eas_build_job_1 = require("@expo/eas-build-job");
const eas_json_1 = require("@expo/eas-json");
const logger_1 = require("@expo/logger");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const figures_1 = tslib_1.__importDefault(require("figures"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const local_1 = require("../../build/local");
const runBuildAndSubmit_1 = require("../../build/runBuildAndSubmit");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const generated_1 = require("../../graphql/generated");
const log_1 = tslib_1.__importStar(require("../../log"));
const platform_1 = require("../../platform");
const prompts_1 = require("../../prompts");
const uniq_1 = tslib_1.__importDefault(require("../../utils/expodash/uniq"));
const json_1 = require("../../utils/json");
const statuspageService_1 = require("../../utils/statuspageService");
class Build extends EasCommand_1.default {
    static description = 'start a build';
    static flags = {
        platform: core_1.Flags.option({
            char: 'p',
            options: ['android', 'ios', 'all'],
        })(),
        'skip-credentials-check': core_1.Flags.boolean({
            default: false,
            hidden: true,
        }),
        'skip-project-configuration': core_1.Flags.boolean({
            default: false,
            hidden: true,
        }),
        profile: core_1.Flags.string({
            char: 'e',
            description: 'Name of the build profile from eas.json. Defaults to "production" if defined in eas.json.',
            helpValue: 'PROFILE_NAME',
        }),
        local: core_1.Flags.boolean({
            default: false,
            description: 'Run build locally [experimental]',
        }),
        output: core_1.Flags.string({
            description: 'Output path for local build',
        }),
        wait: core_1.Flags.boolean({
            default: true,
            allowNo: true,
            description: 'Wait for build(s) to complete',
        }),
        'clear-cache': core_1.Flags.boolean({
            default: false,
            description: 'Clear cache before the build',
        }),
        'auto-submit': core_1.Flags.boolean({
            char: 's',
            default: false,
            description: 'Submit on build complete using the submit profile with the same name as the build profile',
            exclusive: ['auto-submit-with-profile'],
            aliases: ['submit'],
        }),
        'auto-submit-with-profile': core_1.Flags.string({
            description: 'Submit on build complete using the submit profile with provided name',
            helpValue: 'PROFILE_NAME',
            exclusive: ['auto-submit'],
        }),
        'what-to-test': core_1.Flags.string({
            description: 'Specify the "What to Test" information for the build in TestFlight (iOS-only). To be used with the `auto-submit` flag',
        }),
        'resource-class': core_1.Flags.option({
            options: Object.values(eas_json_1.ResourceClass),
            hidden: true,
            deprecated: {
                message: chalk_1.default.yellow('The --resource-class flag has been deprecated. Define the resource class in eas.json.\nLearn more: https://docs.expo.dev/build-reference/eas-json/'),
            },
            description: 'The instance type that will be used to run this build [experimental]',
        })(),
        message: core_1.Flags.string({
            char: 'm',
            description: 'A short message describing the build',
        }),
        'build-logger-level': core_1.Flags.option({
            description: 'The level of logs to output during the build process. Defaults to "info".',
            options: Object.values(logger_1.LoggerLevel),
        })(),
        'freeze-credentials': core_1.Flags.boolean({
            default: false,
            description: 'Prevent the build from updating credentials in non-interactive mode',
        }),
        'verbose-logs': core_1.Flags.boolean({
            default: false,
            description: 'Use verbose logs for the build process',
        }),
        ...flags_1.EasNonInteractiveAndJsonFlags,
    };
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.DynamicProjectConfig,
        ...this.ContextOptions.ProjectDir,
        ...this.ContextOptions.Analytics,
        ...this.ContextOptions.Vcs,
    };
    async runAsync() {
        const { flags: rawFlags } = await this.parse(Build);
        if (rawFlags.json) {
            (0, json_1.enableJsonOutput)();
        }
        const flags = this.sanitizeFlags(rawFlags);
        const { loggedIn: { actor, graphqlClient }, getDynamicPrivateProjectConfigAsync, projectDir, analytics, vcsClient, } = await this.getContextAsync(Build, {
            nonInteractive: flags.nonInteractive,
            withServerSideEnvironment: null,
        });
        await handleDeprecatedEasJsonAsync(projectDir, flags.nonInteractive);
        if (!flags.localBuildOptions.localBuildMode) {
            await (0, statuspageService_1.maybeWarnAboutEasOutagesAsync)(graphqlClient, flags.autoSubmit
                ? [generated_1.StatuspageServiceName.EasBuild, generated_1.StatuspageServiceName.EasSubmit]
                : [generated_1.StatuspageServiceName.EasBuild]);
        }
        const flagsWithPlatform = await this.ensurePlatformSelectedAsync(flags);
        const { buildProfiles } = await (0, runBuildAndSubmit_1.runBuildAndSubmitAsync)({
            graphqlClient,
            analytics,
            vcsClient,
            projectDir,
            flags: flagsWithPlatform,
            actor,
            getDynamicPrivateProjectConfigAsync,
        });
        this.maybeSuggestUsingEasBuildDev({
            buildProfiles,
            nonInteractive: flags.nonInteractive,
        });
    }
    sanitizeFlags(flags) {
        const { json, nonInteractive } = (0, flags_1.resolveNonInteractiveAndJsonFlags)(flags);
        if (!flags.local && flags.output) {
            core_1.Errors.error('--output is allowed only for local builds', { exit: 1 });
        }
        if (!flags.platform && nonInteractive) {
            core_1.Errors.error('--platform is required when building in non-interactive mode', { exit: 1 });
        }
        const autoSubmit = flags['auto-submit'] || flags['auto-submit-with-profile'] !== undefined;
        if (flags['what-to-test'] && !autoSubmit) {
            core_1.Errors.error('The --what-to-test flag can only be used with the --auto-submit or --auto-submit-with-profile flag.', { exit: 1 });
        }
        const requestedPlatform = flags.platform &&
            Object.values(platform_1.RequestedPlatform).includes(flags.platform.toLowerCase())
            ? flags.platform.toLowerCase()
            : undefined;
        if (flags['skip-credentials-check']) {
            log_1.default.warnDeprecatedFlag('skip-credentials-check', 'Build credentials validation is always skipped with the --non-interactive flag. You can also skip interactively.');
            log_1.default.newLine();
        }
        if (flags['skip-project-configuration']) {
            log_1.default.warnDeprecatedFlag('skip-project-configuration', 'Automatic configuration of native code is no longer optional.');
            log_1.default.newLine();
        }
        const message = flags['message'];
        if (message && message.length > 1024) {
            core_1.Errors.error('Message cannot be longer than 1024 characters.', { exit: 1 });
        }
        const profile = flags['profile'];
        return {
            requestedPlatform,
            profile,
            nonInteractive,
            localBuildOptions: flags['local']
                ? {
                    localBuildMode: local_1.LocalBuildMode.LOCAL_BUILD_PLUGIN,
                    verbose: true,
                    artifactPath: flags.output && path_1.default.resolve(process.cwd(), flags.output),
                }
                : {},
            wait: flags['wait'],
            clearCache: flags['clear-cache'],
            json,
            autoSubmit,
            submitProfile: flags['auto-submit-with-profile'] ?? profile,
            resourceClass: flags['resource-class'],
            message,
            buildLoggerLevel: flags['build-logger-level'],
            freezeCredentials: flags['freeze-credentials'],
            isVerboseLoggingEnabled: flags['verbose-logs'],
            whatToTest: flags['what-to-test'],
        };
    }
    async ensurePlatformSelectedAsync(flags) {
        const requestedPlatform = await (0, platform_1.selectRequestedPlatformAsync)(flags.requestedPlatform);
        if (flags.localBuildOptions.localBuildMode) {
            if (flags.autoSubmit) {
                // TODO: implement this
                core_1.Errors.error('Auto-submits are not yet supported when building locally', { exit: 1 });
            }
            if (requestedPlatform === platform_1.RequestedPlatform.All) {
                core_1.Errors.error('Builds for multiple platforms are not supported with flag --local', {
                    exit: 1,
                });
            }
            else if (process.platform !== 'darwin' && requestedPlatform === platform_1.RequestedPlatform.Ios) {
                core_1.Errors.error('Unsupported platform, macOS is required to build apps for iOS', { exit: 1 });
            }
            else if (!['linux', 'darwin'].includes(process.platform) &&
                requestedPlatform === platform_1.RequestedPlatform.Android) {
                core_1.Errors.error('Unsupported platform, macOS or Linux is required to build apps for Android', {
                    exit: 1,
                });
            }
        }
        return {
            ...flags,
            requestedPlatform,
        };
    }
    maybeSuggestUsingEasBuildDev({ buildProfiles, nonInteractive, }) {
        // suggest using eas build:dev if the build configuration results in simulator/emulator dev client build
        if (!nonInteractive &&
            !process.env.CI &&
            buildProfiles?.some(({ profile, platform }) => {
                if (profile.developmentClient !== true) {
                    return false;
                }
                if (profile.distribution !== 'internal') {
                    return false;
                }
                if (platform === eas_build_job_1.Platform.IOS) {
                    const iosProfile = profile;
                    if (iosProfile.simulator !== true && iosProfile.withoutCredentials !== true) {
                        return false;
                    }
                }
                else {
                    const androidProfile = profile;
                    if (androidProfile.distribution !== 'internal' &&
                        androidProfile.withoutCredentials !== true) {
                        return false;
                    }
                }
                return true;
            })) {
            log_1.default.newLine();
            log_1.default.log(`🔎 TIP: You are using a build configuration that could benefit from using ${chalk_1.default.bold('eas build:dev')} command. Run it to install and run cached development build, or create a new one if a compatible build doesn't exist yet.`);
        }
    }
}
exports.default = Build;
async function handleDeprecatedEasJsonAsync(projectDir, nonInteractive) {
    if (!(await fs_extra_1.default.pathExists(eas_json_1.EasJsonAccessor.formatEasJsonPath(projectDir)))) {
        return;
    }
    const easJsonAccessor = eas_json_1.EasJsonAccessor.fromProjectPath(projectDir);
    const profileNames = await eas_json_1.EasJsonUtils.getBuildProfileNamesAsync(easJsonAccessor);
    const platformAndProfileNames = profileNames.flatMap(profileName => [
        [eas_build_job_1.Platform.ANDROID, profileName],
        [eas_build_job_1.Platform.IOS, profileName],
    ]);
    const deprecatedProfiles = [];
    for (const [platform, profileName] of platformAndProfileNames) {
        const buildProfile = await eas_json_1.EasJsonUtils.getBuildProfileAsync(easJsonAccessor, platform, profileName);
        if (buildProfile.artifactPath) {
            deprecatedProfiles.push([platform, profileName]);
        }
    }
    if (deprecatedProfiles.length === 0) {
        return;
    }
    const deprecatedProfileNames = (0, uniq_1.default)(deprecatedProfiles.map(([, profileName]) => profileName));
    log_1.default.warn(`Some of your build profiles use deprecated field ${chalk_1.default.bold('artifactPath')}:`);
    for (const profileName of deprecatedProfileNames) {
        log_1.default.warn(`- ${profileName}`);
    }
    log_1.default.newLine();
    if (nonInteractive) {
        log_1.default.warn(`${figures_1.default.warning} Action required: rename ${chalk_1.default.bold('artifactPath')} to ${chalk_1.default.bold('applicationArchivePath')} in all of the build profiles listed above.`);
        log_1.default.warn(`See ${(0, log_1.link)('https://docs.expo.dev/build-reference/eas-json/')} for more information.`);
        log_1.default.warn(`This warning will become an error in a future EAS CLI release. This build will continue to use the ${chalk_1.default.bold('artifactPath')} setting.`);
        return;
    }
    const rename = await (0, prompts_1.selectAsync)('Do you want us to handle renaming the field for you?', [
        { title: 'Yes', value: true },
        { title: 'No, I will edit eas.json manually (EAS CLI exits)', value: false },
    ]);
    if (!rename) {
        core_1.Errors.exit(1);
    }
    await easJsonAccessor.readRawJsonAsync();
    for (const [platform, profileName] of deprecatedProfiles) {
        easJsonAccessor.patch(easJsonRawObject => {
            easJsonRawObject.build[profileName][platform].applicationArchivePath =
                easJsonRawObject.build[profileName][platform].artifactPath;
            delete easJsonRawObject.build[profileName][platform].artifactPath;
            return easJsonRawObject;
        });
    }
    await easJsonAccessor.writeAsync();
    log_1.default.withTick('Updated eas.json');
}
