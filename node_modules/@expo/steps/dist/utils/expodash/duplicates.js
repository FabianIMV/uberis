"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicates = duplicates;
function duplicates(items) {
    const visitedItemsSet = new Set();
    const duplicatedItemsSet = new Set();
    for (const item of items) {
        if (visitedItemsSet.has(item)) {
            duplicatedItemsSet.add(item);
        }
        else {
            visitedItemsSet.add(item);
        }
    }
    return [...duplicatedItemsSet];
}
