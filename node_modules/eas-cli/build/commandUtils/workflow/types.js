"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowTriggerType = void 0;
/*
 * Utility types and Zod definitions for workflow commands
 */
var WorkflowTriggerType;
(function (WorkflowTriggerType) {
    WorkflowTriggerType["MANUAL"] = "Manual";
    WorkflowTriggerType["GITHUB"] = "GitHub";
    WorkflowTriggerType["SCHEDULED"] = "Scheduled";
    WorkflowTriggerType["OTHER"] = "Other";
})(WorkflowTriggerType || (exports.WorkflowTriggerType = WorkflowTriggerType = {}));
