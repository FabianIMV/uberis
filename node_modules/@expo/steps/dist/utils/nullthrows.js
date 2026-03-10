"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nullthrows = nullthrows;
function nullthrows(value, message) {
    if (value != null) {
        return value;
    }
    throw new TypeError(message ?? `Expected value not to be null or undefined but got ${value}`);
}
