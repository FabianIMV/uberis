"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const eas_build_job_1 = require("@expo/eas-build-job");
const eas_json_1 = require("@expo/eas-json");
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const SetUpBuildCredentials_1 = require("./actions/SetUpBuildCredentials");
const credentialsJsonReader = tslib_1.__importStar(require("../credentialsJson/read"));
class AndroidCredentialsProvider {
    ctx;
    options;
    platform = eas_build_job_1.Platform.ANDROID;
    constructor(ctx, options) {
        this.ctx = ctx;
        this.options = options;
    }
    async getCredentialsAsync(src) {
        switch (src) {
            case eas_json_1.CredentialsSource.LOCAL:
                return await this.getLocalAsync();
            case eas_json_1.CredentialsSource.REMOTE:
                return await this.getRemoteAsync();
        }
    }
    async getRemoteAsync() {
        const setupBuildCredentialsAction = new SetUpBuildCredentials_1.SetUpBuildCredentials(this.options);
        const buildCredentials = await setupBuildCredentialsAction.runAsync(this.ctx);
        return this.toAndroidCredentials(buildCredentials);
    }
    toAndroidCredentials(androidBuildCredentials) {
        return {
            keystore: {
                keystore: (0, nullthrows_1.default)(androidBuildCredentials.androidKeystore?.keystore),
                keystorePassword: (0, nullthrows_1.default)(androidBuildCredentials.androidKeystore?.keystorePassword),
                keyAlias: (0, nullthrows_1.default)(androidBuildCredentials.androidKeystore?.keyAlias),
                keyPassword: androidBuildCredentials.androidKeystore?.keyPassword ?? undefined,
            },
        };
    }
    async getLocalAsync() {
        return await credentialsJsonReader.readAndroidCredentialsAsync(this.ctx.projectDir);
    }
}
exports.default = AndroidCredentialsProvider;
