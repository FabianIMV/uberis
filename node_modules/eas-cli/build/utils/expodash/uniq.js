"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = uniq;
function uniq(items) {
    const set = new Set(items);
    return [...set];
}
