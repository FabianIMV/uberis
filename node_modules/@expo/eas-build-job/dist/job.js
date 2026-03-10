"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobSchema = void 0;
exports.sanitizeBuildJob = sanitizeBuildJob;
const joi_1 = __importDefault(require("joi"));
const Android = __importStar(require("./android"));
const common_1 = require("./common");
const Ios = __importStar(require("./ios"));
exports.JobSchema = joi_1.default.object({
    platform: joi_1.default.string()
        .valid(...Object.values(common_1.Platform))
        .required(),
})
    .when(joi_1.default.object({ platform: common_1.Platform.ANDROID }).unknown(), { then: Android.JobSchema })
    .when(joi_1.default.object({ platform: common_1.Platform.IOS }).unknown(), { then: Ios.JobSchema });
function sanitizeBuildJob(rawJob) {
    const { value, error } = exports.JobSchema.validate(rawJob, {
        stripUnknown: true,
        convert: true,
        abortEarly: false,
    });
    if (error) {
        throw error;
    }
    else {
        const job = value;
        return job;
    }
}
