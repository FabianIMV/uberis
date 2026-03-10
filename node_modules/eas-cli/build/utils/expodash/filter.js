"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truthy = truthy;
/** A predicate to filter arrays on truthy values, returning a type-safe array. */
function truthy(value) {
    return !!value;
}
