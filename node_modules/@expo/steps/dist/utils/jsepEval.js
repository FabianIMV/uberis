"use strict";
// https://github.com/Sensative/jsep-eval/blob/master/src/jsep-eval.js
// - migrated to TypeScript
// - small refactoring (splitting operators into unary/binary)
// - lack of LogicalExpression we don't need, because our version of JSEP does not expose it
// - lack of Promise wrapper we don't need
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsepEval = jsepEval;
const assert_1 = __importDefault(require("assert"));
const jsep_1 = __importDefault(require("jsep"));
const lodash_get_1 = __importDefault(require("lodash.get"));
const binaryOperatorFunctions = {
    '===': (a, b) => a === b,
    '!==': (a, b) => a !== b,
    '==': (a, b) => a == b, // eslint-disable-line
    '!=': (a, b) => a != b, // eslint-disable-line
    '>': (a, b) => a > b,
    '<': (a, b) => a < b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '%': (a, b) => a % b, // remainder
    '**': (a, b) => a ** b, // exponentiation
    '&': (a, b) => a & b, // bitwise AND
    '|': (a, b) => a | b, // bitwise OR
    '^': (a, b) => a ^ b, // bitwise XOR
    '<<': (a, b) => a << b, // left shift
    '>>': (a, b) => a >> b, // sign-propagating right shift
    '>>>': (a, b) => a >>> b, // zero-fill right shift
    // Let's make a home for the logical operators here as well
    '||': (a, b) => a || b,
    '&&': (a, b) => a && b,
};
const unaryOperatorFunctions = {
    '!': (a) => !a,
    '~': (a) => ~a, // bitwise NOT
    '+': (a) => +a, // unary plus
    '-': (a) => -a, // unary negation
    '++': (a) => ++a, // increment
    '--': (a) => --a, // decrement
};
function isValid(expression, types) {
    return types.includes(expression.type);
}
function getParameterPath(node, context) {
    // it's a MEMBER expression
    // EXAMPLES:  a[b] (computed)
    //            a.b (not computed)
    const computed = node.computed;
    const object = node.object;
    const property = node.property;
    // object is either 'IDENTIFIER', 'MEMBER', or 'THIS'
    (0, assert_1.default)(isValid(object, ['MemberExpression', 'Identifier', 'ThisExpression']), 'Invalid object type');
    (0, assert_1.default)(property, 'Member expression property is missing');
    let objectPath = '';
    if (object.type === 'ThisExpression') {
        objectPath = '';
    }
    else if (isValid(object, ['Identifier'])) {
        objectPath = object.name;
    }
    else {
        objectPath = getParameterPath(object, context);
    }
    if (computed) {
        // if computed -> evaluate anew
        const propertyPath = evaluateExpressionNode(property, context);
        return objectPath + '[' + propertyPath + ']';
    }
    else if (property.type === 'Identifier') {
        return (objectPath ? objectPath + '.' : '') + property.name;
    }
    else if (property.type === 'CallExpression') {
        const propertyPath = evaluateExpressionNode(property, context);
        return (objectPath ? objectPath + '.' : '') + propertyPath;
    }
    else if (property.type === 'Literal') {
        return (objectPath ? objectPath + '.' : '') + `${property.value}`;
    }
    else {
        (0, assert_1.default)(isValid(property, ['MemberExpression']), 'Invalid object type');
        const propertyPath = getParameterPath(property, context);
        return (objectPath ? objectPath + '.' : '') + propertyPath;
    }
}
function evaluateExpressionNode(node, context) {
    switch (node.type) {
        case 'Literal': {
            return node.value;
        }
        case 'ThisExpression': {
            return context;
        }
        case 'Compound': {
            const compoundNode = node;
            const expressions = compoundNode.body.map(el => evaluateExpressionNode(el, context));
            return expressions.pop();
        }
        case 'UnaryExpression': {
            const unaryNode = node;
            if (!(unaryNode.operator in unaryOperatorFunctions)) {
                throw new Error(`Unsupported unary operator: ${unaryNode.operator}`);
            }
            const operatorFn = unaryOperatorFunctions[unaryNode.operator];
            const argument = evaluateExpressionNode(unaryNode.argument, context);
            return operatorFn(argument);
        }
        case 'BinaryExpression': {
            const binaryNode = node;
            if (!(binaryNode.operator in binaryOperatorFunctions)) {
                throw new Error(`Unsupported binary operator: ${binaryNode.operator}`);
            }
            const operator = binaryOperatorFunctions[binaryNode.operator];
            const left = evaluateExpressionNode(binaryNode.left, context);
            const right = evaluateExpressionNode(binaryNode.right, context);
            return operator(left, right);
        }
        case 'ConditionalExpression': {
            const conditionalNode = node;
            const test = evaluateExpressionNode(conditionalNode.test, context);
            const consequent = evaluateExpressionNode(conditionalNode.consequent, context);
            const alternate = evaluateExpressionNode(conditionalNode.alternate, context);
            return test ? consequent : alternate;
        }
        case 'CallExpression': {
            const allowedCalleeTypes = [
                'MemberExpression',
                'Identifier',
                'ThisExpression',
            ];
            const callNode = node;
            if (!allowedCalleeTypes.includes(callNode.callee.type)) {
                throw new Error(`Invalid function callee type: ${callNode.callee.type}. Expected one of [${allowedCalleeTypes.join(', ')}].`);
            }
            const callee = evaluateExpressionNode(callNode.callee, context);
            const args = callNode.arguments.map(arg => evaluateExpressionNode(arg, context));
            (0, assert_1.default)(typeof callee === 'function', 'Expected a function');
            // eslint-disable-next-line prefer-spread
            return callee.apply(null, args);
        }
        case 'Identifier': {
            const identifier = node.name;
            if (!(identifier in context)) {
                throw new Error(`Invalid identifier "${identifier}". Expected one of [${Object.keys(context).join(', ')}].`);
            }
            return (0, lodash_get_1.default)(context, identifier);
        }
        case 'MemberExpression': {
            const memberNode = node;
            return (0, lodash_get_1.default)(evaluateExpressionNode(memberNode.object, context), getParameterPath({
                type: 'MemberExpression',
                object: { type: 'ThisExpression' },
                property: memberNode.property,
                computed: false,
            }, context));
        }
        case 'ArrayExpression': {
            const elements = node.elements.map(el => el ? evaluateExpressionNode(el, context) : null);
            return elements;
        }
        default:
            throw new Error(`Unsupported expression type: ${node.type}`);
    }
}
function jsepEval(expression, context) {
    const tree = (0, jsep_1.default)(expression);
    return evaluateExpressionNode(tree, context ?? {});
}
