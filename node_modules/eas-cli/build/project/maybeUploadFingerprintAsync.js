"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeUploadFingerprintAsync = maybeUploadFingerprintAsync;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const uuid_1 = require("uuid");
const local_1 = require("../build/local");
const generated_1 = require("../graphql/generated");
const log_1 = tslib_1.__importDefault(require("../log"));
const uploads_1 = require("../uploads");
const paths_1 = require("../utils/paths");
async function maybeUploadFingerprintAsync({ hash, fingerprint, graphqlClient, localBuildMode, }) {
    if (localBuildMode === local_1.LocalBuildMode.LOCAL_BUILD_PLUGIN) {
        // We're not uploading local build fingerprints to EAS
        return {
            hash,
        };
    }
    await fs_extra_1.default.mkdirp((0, paths_1.getTmpDirectory)());
    const fingerprintLocation = path_1.default.join((0, paths_1.getTmpDirectory)(), `${(0, uuid_1.v4)()}-runtime-fingerprint.json`);
    await fs_extra_1.default.writeJSON(fingerprintLocation, {
        hash,
        sources: fingerprint.fingerprintSources,
    });
    let fingerprintGCSBucketKey = undefined;
    try {
        fingerprintGCSBucketKey = await (0, uploads_1.uploadFileAtPathToGCSAsync)(graphqlClient, generated_1.UploadSessionType.EasUpdateFingerprint, fingerprintLocation);
    }
    catch (err) {
        let errMessage = 'Failed to upload fingerprint to EAS';
        if (err.message) {
            errMessage += `\n\nReason: ${err.message}`;
        }
        log_1.default.warn(errMessage);
        return {
            hash,
        };
    }
    finally {
        await fs_extra_1.default.remove(fingerprintLocation);
    }
    return {
        hash,
        fingerprintSource: {
            type: generated_1.FingerprintSourceType.Gcs,
            bucketKey: fingerprintGCSBucketKey,
            isDebugFingerprint: fingerprint.isDebugFingerprintSource,
        },
    };
}
