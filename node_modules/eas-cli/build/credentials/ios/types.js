"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringLike = exports.booleanLike = void 0;
const zod_1 = require("zod");
// `z.coerce.boolean()` does `Boolean(val)` under the hood,
// which is not what we want. See:
// https://github.com/colinhacks/zod/issues/2985#issuecomment-2230692578
exports.booleanLike = zod_1.z.union([
    zod_1.z.boolean(),
    zod_1.z.codec(zod_1.z.number(), zod_1.z.boolean(), {
        decode: n => !!n,
        encode: b => (b ? 1 : 0),
    }),
    zod_1.z.stringbool({ truthy: ['true', 'True'], falsy: ['false', 'False'] }),
]);
exports.stringLike = zod_1.z.codec(zod_1.z.union([
    // We're going to coerce numbers and strings into strings.
    zod_1.z.number(),
    zod_1.z.string(),
    // We do not allow other primitives, like:
    // - bigints, symbols - because YAML does not support them,
    // - booleans - because YAML accepts `True` and `true` as boolean input
    //   and parses both as JS `true` -- if we stringified that,
    //   we would lose the capital "T" which may not be what the user expects,
    // - nulls - user should do `"null"` or not pass the property at all.
]), zod_1.z.string(), {
    decode: value => {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number') {
            return String(value);
        }
        throw new Error(`Cannot convert ${typeof value} to string: ${value}`);
    },
    encode: value => value,
});
