"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchMappingValidationError = void 0;
exports.getEmptyBranchMapping = getEmptyBranchMapping;
exports.getAlwaysTrueBranchMapping = getAlwaysTrueBranchMapping;
exports.hasEmptyBranchMap = hasEmptyBranchMap;
exports.hasStandardBranchMap = hasStandardBranchMap;
exports.getStandardBranchId = getStandardBranchId;
exports.isEmptyBranchMapping = isEmptyBranchMapping;
exports.isAlwaysTrueBranchMapping = isAlwaysTrueBranchMapping;
exports.getBranchIds = getBranchIds;
exports.getBranchMapping = getBranchMapping;
exports.getNodesFromStatement = getNodesFromStatement;
exports.isAndStatement = isAndStatement;
exports.isStatement = isStatement;
exports.isNodeObject = isNodeObject;
exports.andStatement = andStatement;
exports.isAlwaysTrue = isAlwaysTrue;
exports.alwaysTrue = alwaysTrue;
exports.equalsOperator = equalsOperator;
exports.hashLtOperator = hashLtOperator;
exports.assertVersion = assertVersion;
exports.assertStatement = assertStatement;
exports.assertNodeObject = assertNodeObject;
exports.assertNumber = assertNumber;
exports.assertString = assertString;
function getEmptyBranchMapping() {
    return {
        version: 0,
        data: [],
    };
}
function getAlwaysTrueBranchMapping(branchId) {
    return {
        version: 0,
        data: [
            {
                branchId,
                branchMappingLogic: 'true',
            },
        ],
    };
}
function hasEmptyBranchMap(channelInfo) {
    const branchMapping = getBranchMapping(channelInfo.branchMapping);
    return isEmptyBranchMapping(branchMapping);
}
function hasStandardBranchMap(channelInfo) {
    const branchMapping = getBranchMapping(channelInfo.branchMapping);
    return isAlwaysTrueBranchMapping(branchMapping);
}
function getStandardBranchId(channelInfo) {
    const branchMapping = getBranchMapping(channelInfo.branchMapping);
    assertAlwaysTrueBranchMapping(branchMapping);
    return getBranchIdFromStandardMapping(branchMapping);
}
function isEmptyBranchMapping(branchMapping) {
    return branchMapping.data.length === 0;
}
function isAlwaysTrueBranchMapping(branchMapping) {
    const numBranches = branchMapping.data.length;
    if (numBranches !== 1) {
        return false;
    }
    const branchMappingLogic = branchMapping.data[0].branchMappingLogic;
    return isAlwaysTrue(branchMappingLogic);
}
function getBranchIdFromStandardMapping(branchMapping) {
    return branchMapping.data[0].branchId;
}
function getBranchIds(branchMapping) {
    return branchMapping.data.map(data => data.branchId);
}
function getBranchMapping(branchMappingString) {
    try {
        return JSON.parse(branchMappingString);
    }
    catch {
        throw new Error(`Could not parse branchMapping string into a JSON: "${branchMappingString}"`);
    }
}
function getNodesFromStatement(statement) {
    return statement.slice(1);
}
function isAndStatement(statement) {
    return statement[0] === 'and';
}
function isStatement(node) {
    return Array.isArray(node);
}
function isNodeObject(node) {
    return typeof node === 'object' && !isStatement(node);
}
function andStatement(nodes) {
    return ['and', ...nodes];
}
function isAlwaysTrue(node) {
    return node === 'true';
}
function alwaysTrue() {
    return 'true';
}
function equalsOperator() {
    return '==';
}
function hashLtOperator() {
    return 'hash_lt';
}
function isVersion(branchMapping, version) {
    return branchMapping.version === version;
}
function assertVersion(channelInfo, version) {
    const branchMapping = getBranchMapping(channelInfo.branchMapping);
    if (!isVersion(branchMapping, version)) {
        throw new BranchMappingValidationError(`Expected branch mapping version ${version}. Received: ${JSON.stringify(branchMapping)}`);
    }
}
function assertStatement(node) {
    if (!isStatement(node)) {
        throw new BranchMappingValidationError('Branch mapping node must be a statement. Received: ' + JSON.stringify(node));
    }
}
function assertNodeObject(node) {
    if (!isNodeObject(node)) {
        throw new BranchMappingValidationError('Branch mapping node must be an object. Received: ' + JSON.stringify(node));
    }
}
function assertNumber(operand) {
    if (typeof operand !== 'number') {
        throw new BranchMappingValidationError('Expected a number. Received: ' + JSON.stringify(operand));
    }
}
function assertString(operand) {
    if (typeof operand !== 'string') {
        throw new BranchMappingValidationError('Expected a string. Received: ' + JSON.stringify(operand));
    }
}
function assertAlwaysTrueBranchMapping(branchMapping) {
    if (!isAlwaysTrueBranchMapping(branchMapping)) {
        throw new BranchMappingValidationError('Expected standard branch mapping. Received: ' + JSON.stringify(branchMapping));
    }
}
class BranchMappingValidationError extends Error {
}
exports.BranchMappingValidationError = BranchMappingValidationError;
