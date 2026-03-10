"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsedYamlFromWorkflowContents = parsedYamlFromWorkflowContents;
const tslib_1 = require("tslib");
const YAML = tslib_1.__importStar(require("yaml"));
function parsedYamlFromWorkflowContents(workflowFileContents) {
    return YAML.parse(workflowFileContents.yamlConfig, {
        // Keep in sync with backend parser options.
        merge: true,
        maxAliasCount: 50,
    });
}
