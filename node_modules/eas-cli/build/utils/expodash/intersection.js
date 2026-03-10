"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = intersection;
function intersection(items1, items2) {
    const set1 = new Set(items1);
    const set2 = new Set(items2);
    return Array.from(new Set([...set1].filter(i => set2.has(i))));
}
