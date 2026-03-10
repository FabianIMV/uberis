"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearIntervalAsync = void 0;
const set_interval_async_timer_cjs_1 = require("./set-interval-async-timer.cjs");
/**
 * Stops an execution cycle started by setIntervalAsync.
 * Any ongoing function executions will run until completion,
 * but all future ones will be cancelled.
 */
async function clearIntervalAsync(timer) {
    if (!(timer instanceof set_interval_async_timer_cjs_1.SetIntervalAsyncTimer)) {
        throw new TypeError("First argument is not an instance of SetIntervalAsyncTimer");
    }
    await set_interval_async_timer_cjs_1.SetIntervalAsyncTimer.stopTimer(timer);
}
exports.clearIntervalAsync = clearIntervalAsync;
