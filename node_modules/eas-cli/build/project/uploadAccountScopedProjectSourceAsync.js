"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAccountScopedProjectSourceAsync = uploadAccountScopedProjectSourceAsync;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const repository_1 = require("../build/utils/repository");
const generated_1 = require("../graphql/generated");
const log_1 = tslib_1.__importStar(require("../log"));
const uploads_1 = require("../uploads");
const files_1 = require("../utils/files");
const progress_1 = require("../utils/progress");
/**
 * Archives the project and uploads it to GCS as account-scoped object.
 * Used in workflows. Takes care of logging progress and cleaning up the tarball.
 */
async function uploadAccountScopedProjectSourceAsync({ graphqlClient, vcsClient, accountId, }) {
    let projectTarballPath;
    try {
        log_1.default.newLine();
        log_1.default.log(`Compressing project files and uploading to EAS. ${(0, log_1.learnMore)('https://expo.fyi/eas-build-archive')}`);
        const projectTarball = await (0, repository_1.makeProjectTarballAsync)(vcsClient);
        projectTarballPath = projectTarball.path;
        (0, repository_1.maybeWarnAboutProjectTarballSize)(projectTarball.size);
        (0, repository_1.assertProjectTarballSizeDoesNotExceedLimit)(projectTarball.size);
        const projectArchiveBucketKey = await (0, uploads_1.uploadAccountScopedFileAtPathToGCSAsync)(graphqlClient, {
            accountId,
            type: generated_1.AccountUploadSessionType.WorkflowsProjectSources,
            path: projectTarball.path,
            handleProgressEvent: (0, progress_1.createProgressTracker)({
                total: projectTarball.size,
                message: ratio => `Uploading project archive to EAS (${(0, files_1.formatBytes)(projectTarball.size * ratio)} / ${(0, files_1.formatBytes)(projectTarball.size)})`,
                completedMessage: (duration) => `Uploaded project archive to EAS ${chalk_1.default.dim(duration)}`,
            }),
        });
        return { projectArchiveBucketKey };
    }
    finally {
        if (projectTarballPath) {
            await node_fs_1.default.promises.rm(projectTarballPath);
        }
    }
}
