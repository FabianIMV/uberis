"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = chunk;
function chunk(list, size = 1) {
    const result = [];
    for (let i = 0; i < list.length; i++) {
        const isFirstElementInChunk = i % size === 0;
        if (isFirstElementInChunk) {
            result.push([list[i]]);
        }
        else {
            result[result.length - 1].push(list[i]);
        }
    }
    return result;
}
