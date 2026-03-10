"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixed = exports.dynamic = exports.clearIntervalAsync = exports.setIntervalAsync = void 0;
const clear_interval_async_cjs_1 = require("../clear-interval-async.cjs");
Object.defineProperty(exports, "clearIntervalAsync", { enumerable: true, get: function () { return clear_interval_async_cjs_1.clearIntervalAsync; } });
const set_interval_async_cjs_1 = require("../dynamic/set-interval-async.cjs");
const set_interval_async_cjs_2 = require("../fixed/set-interval-async.cjs");
const setIntervalAsync = set_interval_async_cjs_1.setIntervalAsync;
exports.setIntervalAsync = setIntervalAsync;
const dynamic = {
    setIntervalAsync: set_interval_async_cjs_1.setIntervalAsync,
};
exports.dynamic = dynamic;
const fixed = {
    setIntervalAsync: set_interval_async_cjs_2.setIntervalAsync,
};
exports.fixed = fixed;
