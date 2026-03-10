"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectIdContextField = void 0;
const tslib_1 = require("tslib");
const ContextField_1 = tslib_1.__importDefault(require("./ContextField"));
const findProjectDirAndVerifyProjectSetupAsync_1 = require("./contextUtils/findProjectDirAndVerifyProjectSetupAsync");
const getProjectIdAsync_1 = require("./contextUtils/getProjectIdAsync");
const expoConfig_1 = require("../../project/expoConfig");
class ProjectIdContextField extends ContextField_1.default {
    async getValueAsync({ nonInteractive, sessionManager }) {
        const projectDir = await (0, findProjectDirAndVerifyProjectSetupAsync_1.findProjectDirAndVerifyProjectSetupAsync)();
        const expBefore = await (0, expoConfig_1.getPrivateExpoConfigAsync)(projectDir);
        const projectId = await (0, getProjectIdAsync_1.getProjectIdAsync)(sessionManager, expBefore, {
            nonInteractive,
        });
        return projectId;
    }
}
exports.ProjectIdContextField = ProjectIdContextField;
