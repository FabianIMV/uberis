"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureNonExemptEncryptionIsDefinedForManagedProjectAsync = ensureNonExemptEncryptionIsDefinedForManagedProjectAsync;
const tslib_1 = require("tslib");
const config_1 = require("@expo/config");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const log_1 = tslib_1.__importStar(require("../../log"));
const prompts_1 = require("../../prompts");
/** Non-exempt encryption must be set on every build in App Store Connect, we move it to before the build process to attempt only setting it once for the entire life-cycle of the project. */
async function ensureNonExemptEncryptionIsDefinedForManagedProjectAsync({ projectDir, exp, nonInteractive, }) {
    // TODO: We could add bare workflow support in the future.
    // TODO: We could add wizard support for non-exempt encryption in the future.
    const ITSAppUsesNonExemptEncryption = exp.ios?.infoPlist?.ITSAppUsesNonExemptEncryption ?? exp.ios?.config?.usesNonExemptEncryption;
    if (ITSAppUsesNonExemptEncryption == null) {
        await configureNonExemptEncryptionAsync({
            projectDir,
            exp,
            nonInteractive,
        });
    }
    else {
        log_1.default.debug(`ITSAppUsesNonExemptEncryption is defined in the app config.`);
    }
}
async function configureNonExemptEncryptionAsync({ projectDir, exp, nonInteractive, }) {
    const description = (0, config_1.getProjectConfigDescription)(projectDir);
    if (nonInteractive) {
        log_1.default.warn((0, chalk_1.default) `${description} is missing {bold ios.infoPlist.ITSAppUsesNonExemptEncryption} boolean. Manual configuration is required in App Store Connect before the app can be tested.`);
        return;
    }
    let onlyExemptEncryption = await (0, prompts_1.confirmAsync)({
        message: `iOS app only uses standard/exempt encryption? ${chalk_1.default.dim((0, log_1.learnMore)('https://developer.apple.com/documentation/Security/complying-with-encryption-export-regulations'))}`,
        initial: true,
    });
    if (!onlyExemptEncryption) {
        const confirm = await (0, prompts_1.confirmAsync)({
            message: `Are you sure your app uses non-exempt encryption? Selecting 'Yes' will require annual self-classification reports for the US government.`,
            initial: true,
        });
        if (!confirm) {
            log_1.default.warn((0, chalk_1.default) `Set {bold ios.infoPlist.ITSAppUsesNonExemptEncryption} in ${description} to release Apple builds faster.`);
            onlyExemptEncryption = true;
        }
    }
    const ITSAppUsesNonExemptEncryption = !onlyExemptEncryption;
    // Only set this value if the answer is no, this enables developers to see the more in-depth prompt in App Store Connect. They can set the value manually in the app.json to avoid the EAS prompt in subsequent builds.
    if (ITSAppUsesNonExemptEncryption) {
        log_1.default.warn(`You'll need to manually configure the encryption status in App Store Connect before your build can be tested.`);
        return;
    }
    // NOTE: Is is it possible to assert that the config needs to be modifiable before building the app?
    const modification = await (0, config_1.modifyConfigAsync)(projectDir, {
        ios: {
            ...(exp.ios ?? {}),
            infoPlist: {
                ...(exp.ios?.infoPlist ?? {}),
                ITSAppUsesNonExemptEncryption,
            },
        },
    }, {
        skipSDKVersionRequirement: true,
    });
    if (modification.type !== 'success') {
        log_1.default.log();
        if (modification.type === 'warn') {
            // The project is using a dynamic config, give the user a helpful log and bail out.
            log_1.default.log(chalk_1.default.yellow(modification.message));
        }
        const edits = {
            ios: {
                infoPlist: {
                    ITSAppUsesNonExemptEncryption,
                },
            },
        };
        log_1.default.log(chalk_1.default.cyan(`Add the following to ${description}:`));
        log_1.default.log();
        log_1.default.log(JSON.stringify(edits, null, 2));
        log_1.default.log();
    }
}
