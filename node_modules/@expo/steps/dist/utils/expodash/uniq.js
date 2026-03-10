"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniq = uniq;
function uniq(items) {
    const set = new Set(items);
    return [...set];
}
