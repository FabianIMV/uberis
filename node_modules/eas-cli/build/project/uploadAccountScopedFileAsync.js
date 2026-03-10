"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAccountScopedFileAsync = uploadAccountScopedFileAsync;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const generated_1 = require("../graphql/generated");
const uploads_1 = require("../uploads");
const files_1 = require("../utils/files");
const progress_1 = require("../utils/progress");
/**
 * Uploads a file to GCS as account-scoped object.
 * Used in workflows. Takes care of logging progress.
 * (Uses file name when mentioning file in logs.)
 */
async function uploadAccountScopedFileAsync({ graphqlClient, accountId, filePath, maxSizeBytes, }) {
    const fileName = node_path_1.default.basename(filePath);
    const fileStat = await node_fs_1.default.promises.stat(filePath);
    if (fileStat.size > maxSizeBytes) {
        throw new Error(`File is too big. Maximum allowed size is ${(0, files_1.formatBytes)(maxSizeBytes)}.`);
    }
    const fileBucketKey = await (0, uploads_1.uploadAccountScopedFileAtPathToGCSAsync)(graphqlClient, {
        accountId,
        type: generated_1.AccountUploadSessionType.WorkflowsProjectSources,
        path: filePath,
        handleProgressEvent: (0, progress_1.createProgressTracker)({
            total: fileStat.size,
            message: ratio => `Uploading ${fileName} to EAS (${(0, files_1.formatBytes)(fileStat.size * ratio)} / ${(0, files_1.formatBytes)(fileStat.size)})`,
            completedMessage: (duration) => `Uploaded ${fileName} to EAS ${chalk_1.default.dim(duration)}`,
        }),
    });
    return { fileBucketKey };
}
