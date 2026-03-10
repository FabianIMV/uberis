"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = areSetsEqual;
function areSetsEqual(a, b) {
    return a.size === b.size && [...a].every(value => b.has(value));
}
