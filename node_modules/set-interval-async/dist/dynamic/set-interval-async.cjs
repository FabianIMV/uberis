"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setIntervalAsync = exports.clearIntervalAsync = void 0;
const clear_interval_async_cjs_1 = require("../clear-interval-async.cjs");
Object.defineProperty(exports, "clearIntervalAsync", { enumerable: true, get: function () { return clear_interval_async_cjs_1.clearIntervalAsync; } });
const set_interval_async_timer_cjs_1 = require("../set-interval-async-timer.cjs");
/**
 * Executes the given handler at fixed intervals, while preventing
 * multiple concurrent executions. The handler will never be executed
 * concurrently more than once in any given moment, providing a fixed
 * time interval between the end of a given execution and the start of
 * the following one.
 */
function setIntervalAsync(handler, intervalMs, ...handlerArgs) {
    if (!(typeof handler === "function")) {
        throw new TypeError("First argument is not a function");
    }
    if (!(typeof intervalMs === "number")) {
        throw new TypeError("Second argument is not a number");
    }
    return set_interval_async_timer_cjs_1.SetIntervalAsyncTimer.startTimer("dynamic", handler, intervalMs, ...handlerArgs);
}
exports.setIntervalAsync = setIntervalAsync;
