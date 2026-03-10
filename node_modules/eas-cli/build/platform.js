"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestedPlatformDisplayNames = exports.RequestedPlatform = exports.appPlatformEmojis = exports.appPlatformDisplayNames = void 0;
exports.selectRequestedPlatformAsync = selectRequestedPlatformAsync;
exports.selectPlatformWithExitOptionAsync = selectPlatformWithExitOptionAsync;
exports.selectPlatformAsync = selectPlatformAsync;
exports.toPlatforms = toPlatforms;
const tslib_1 = require("tslib");
const eas_build_job_1 = require("@expo/eas-build-job");
const generated_1 = require("./graphql/generated");
const log_1 = tslib_1.__importDefault(require("./log"));
const prompts_1 = require("./prompts");
exports.appPlatformDisplayNames = {
    [generated_1.AppPlatform.Android]: 'Android',
    [generated_1.AppPlatform.Ios]: 'iOS',
};
exports.appPlatformEmojis = {
    [generated_1.AppPlatform.Ios]: '🍏',
    [generated_1.AppPlatform.Android]: '🤖',
};
// for `eas build`, `eas submit`, and `eas update`
var RequestedPlatform;
(function (RequestedPlatform) {
    RequestedPlatform["Android"] = "android";
    RequestedPlatform["Ios"] = "ios";
    RequestedPlatform["All"] = "all";
})(RequestedPlatform || (exports.RequestedPlatform = RequestedPlatform = {}));
exports.requestedPlatformDisplayNames = {
    [RequestedPlatform.Android]: 'Android',
    [RequestedPlatform.Ios]: 'iOS',
    [RequestedPlatform.All]: 'Android and iOS',
};
async function selectRequestedPlatformAsync(platform) {
    if (platform &&
        Object.values(RequestedPlatform).includes(platform.toLowerCase())) {
        return platform.toLowerCase();
    }
    const { requestedPlatform } = await (0, prompts_1.promptAsync)({
        type: 'select',
        message: 'Select platform',
        name: 'requestedPlatform',
        choices: [
            { title: 'All', value: RequestedPlatform.All },
            { title: 'Android', value: RequestedPlatform.Android },
            { title: 'iOS', value: RequestedPlatform.Ios },
        ],
    });
    return requestedPlatform;
}
async function selectPlatformWithExitOptionAsync(platform) {
    return await selectPlatformInternalAsync(platform, true);
}
async function selectPlatformAsync(platform) {
    return await selectPlatformInternalAsync(platform, false);
}
async function selectPlatformInternalAsync(platform, allowExit) {
    if (platform && Object.values(eas_build_job_1.Platform).includes(platform.toLowerCase())) {
        return platform.toLowerCase();
    }
    const platformChoices = [
        { title: 'Android', value: eas_build_job_1.Platform.ANDROID },
        { title: 'iOS', value: eas_build_job_1.Platform.IOS },
    ];
    if (allowExit) {
        platformChoices.push({ title: 'Exit', value: 'Exit' });
    }
    const result = await (0, prompts_1.promptAsync)({
        type: 'select',
        message: 'Select platform',
        name: 'resolvedPlatform',
        choices: platformChoices,
    });
    if (result.resolvedPlatform === 'Exit') {
        log_1.default.addNewLineIfNone();
        log_1.default.log('Exiting');
        process.exit(0);
    }
    return result.resolvedPlatform;
}
function toPlatforms(requestedPlatform) {
    if (requestedPlatform === RequestedPlatform.All) {
        return [eas_build_job_1.Platform.ANDROID, eas_build_job_1.Platform.IOS];
    }
    else if (requestedPlatform === RequestedPlatform.Android) {
        return [eas_build_job_1.Platform.ANDROID];
    }
    else {
        return [eas_build_job_1.Platform.IOS];
    }
}
