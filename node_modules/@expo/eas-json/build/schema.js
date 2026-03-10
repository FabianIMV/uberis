"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EasJsonSchema = void 0;
const tslib_1 = require("tslib");
const joi_1 = tslib_1.__importDefault(require("joi"));
const schema_1 = require("./build/schema");
const schema_2 = require("./submit/schema");
const types_1 = require("./types");
exports.EasJsonSchema = joi_1.default.object({
    $schema: joi_1.default.string(),
    cli: joi_1.default.object({
        version: joi_1.default.string(),
        requireCommit: joi_1.default.boolean(),
        appVersionSource: joi_1.default.string().valid(...Object.values(types_1.AppVersionSource)),
        promptToConfigurePushNotifications: joi_1.default.boolean(),
        updateAssetHostOverride: joi_1.default.string(),
        updateManifestHostOverride: joi_1.default.string(),
    }),
    build: joi_1.default.object().pattern(joi_1.default.string(), schema_1.BuildProfileSchema),
    submit: joi_1.default.object().pattern(joi_1.default.string(), schema_2.UnresolvedSubmitProfileSchema),
});
