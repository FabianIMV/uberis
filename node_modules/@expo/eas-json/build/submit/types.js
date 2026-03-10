"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IosSubmitProfileFieldsToEvaluate = exports.AndroidSubmitProfileFieldsToEvaluate = exports.AndroidReleaseStatus = void 0;
const eas_build_job_1 = require("@expo/eas-build-job");
var AndroidReleaseStatus;
(function (AndroidReleaseStatus) {
    AndroidReleaseStatus["completed"] = "completed";
    AndroidReleaseStatus["draft"] = "draft";
    AndroidReleaseStatus["halted"] = "halted";
    AndroidReleaseStatus["inProgress"] = "inProgress";
})(AndroidReleaseStatus || (exports.AndroidReleaseStatus = AndroidReleaseStatus = {}));
exports.AndroidSubmitProfileFieldsToEvaluate = [
    'serviceAccountKeyPath',
];
exports.IosSubmitProfileFieldsToEvaluate = [
    'ascApiKeyPath',
    'ascApiKeyIssuerId',
    'ascApiKeyId',
];
