"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVcsClient = resolveVcsClient;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const git_1 = tslib_1.__importDefault(require("./clients/git"));
const noVcs_1 = tslib_1.__importDefault(require("./clients/noVcs"));
const NO_VCS_WARNING = `Using EAS CLI without version control system is not recommended, use this mode only if you know what you are doing.`;
let wasNoVcsWarningPrinted = false;
function resolveVcsClient(requireCommit = false) {
    if (process.env.EAS_NO_VCS) {
        if (process.env.NODE_ENV !== 'test') {
            if (!wasNoVcsWarningPrinted) {
                // This log might be printed before cli arguments are evaluated,
                // so it needs to go to stderr in case command is run in JSON
                // only mode.
                // eslint-disable-next-line no-console
                console.error(chalk_1.default.yellow(NO_VCS_WARNING));
                wasNoVcsWarningPrinted = true;
            }
        }
        return new noVcs_1.default();
    }
    return new git_1.default({ requireCommit });
}
