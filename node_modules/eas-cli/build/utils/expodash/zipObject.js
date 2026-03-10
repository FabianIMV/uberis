"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = zipObject;
function zipObject(keys, values) {
    if (keys.length !== values.length) {
        throw new Error('The number of items does not match');
    }
    const result = {};
    for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = values[i];
    }
    return result;
}
