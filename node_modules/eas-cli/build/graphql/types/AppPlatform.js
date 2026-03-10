"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAppPlatform = toAppPlatform;
exports.toPlatform = toPlatform;
const eas_build_job_1 = require("@expo/eas-build-job");
const generated_1 = require("../generated");
function toAppPlatform(platform) {
    if (platform === eas_build_job_1.Platform.ANDROID) {
        return generated_1.AppPlatform.Android;
    }
    else if (platform === eas_build_job_1.Platform.IOS) {
        return generated_1.AppPlatform.Ios;
    }
    else {
        throw new Error(`Unsupported platform: ${platform}`);
    }
}
function toPlatform(appPlatform) {
    if (appPlatform === generated_1.AppPlatform.Android) {
        return eas_build_job_1.Platform.ANDROID;
    }
    else {
        return eas_build_job_1.Platform.IOS;
    }
}
