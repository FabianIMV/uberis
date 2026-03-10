"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRunnableOnSimulatorOrEmulator = isRunnableOnSimulatorOrEmulator;
const generated_1 = require("../graphql/generated");
function isAab(build) {
    return build.artifacts?.applicationArchiveUrl?.endsWith('.aab') ?? false;
}
function didArtifactsExpire(build) {
    return new Date().getTime() > new Date(build.expirationDate).getTime();
}
function isRunnableOnSimulatorOrEmulator(build) {
    return (build.status === generated_1.BuildStatus.Finished &&
        !!build.artifacts?.applicationArchiveUrl &&
        ((build.platform === generated_1.AppPlatform.Ios && build.isForIosSimulator) ||
            (build.platform === generated_1.AppPlatform.Android && !isAab(build))) &&
        !didArtifactsExpire(build));
}
