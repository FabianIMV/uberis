"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeUploadAssetMapAsync = maybeUploadAssetMapAsync;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const generated_1 = require("../graphql/generated");
const log_1 = tslib_1.__importDefault(require("../log"));
const uploads_1 = require("../uploads");
const files_1 = require("../utils/files");
const progress_1 = require("../utils/progress");
async function maybeUploadAssetMapAsync(distRoot, graphqlClient) {
    const assetMapPath = path_1.default.join(distRoot, 'assetmap.json');
    if (!(await fs_extra_1.default.pathExists(assetMapPath))) {
        return null;
    }
    let gcsBucketKey = undefined;
    const fileStat = await fs_extra_1.default.promises.stat(assetMapPath);
    try {
        gcsBucketKey = await (0, uploads_1.uploadFileAtPathToGCSAsync)(graphqlClient, generated_1.UploadSessionType.EasUpdateAssetsMetadata, assetMapPath, (0, progress_1.createProgressTracker)({
            total: fileStat.size,
            message: ratio => `Uploading assetmap.json (${(0, files_1.formatBytes)(fileStat.size * ratio)} / ${(0, files_1.formatBytes)(fileStat.size)})`,
            completedMessage: (duration) => `Uploaded assetmap.json ${chalk_1.default.dim(duration)}`,
        }));
    }
    catch (err) {
        let errMessage = 'Failed to upload assetmap to EAS';
        if (err.message) {
            errMessage += `\n\nReason: ${err.message}`;
        }
        log_1.default.warn(errMessage);
        return null;
    }
    return {
        type: generated_1.AssetMapSourceType.Gcs,
        bucketKey: gcsBucketKey,
    };
}
