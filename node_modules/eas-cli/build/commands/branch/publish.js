"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
class BranchPublish extends EasCommand_1.default {
    static description = 'deprecated, use "eas update"';
    static hidden = true;
    async runAsync() {
        throw new Error(BranchPublish.description);
    }
}
exports.default = BranchPublish;
