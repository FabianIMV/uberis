"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = mapMapAsync;
async function mapMapAsync(map, mapper) {
    const resultingMap = new Map();
    await Promise.all(Array.from(map.keys()).map(async (k) => {
        const initialValue = map.get(k);
        const result = await mapper(initialValue, k);
        resultingMap.set(k, result);
    }));
    return resultingMap;
}
