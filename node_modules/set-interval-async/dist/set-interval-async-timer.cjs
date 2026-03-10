"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetIntervalAsyncTimer = void 0;
const MIN_INTERVAL_MS = 10;
const MAX_INTERVAL_MS = 2147483647;
class SetIntervalAsyncTimer {
    #timeout = undefined;
    #promise = undefined;
    #stopped = false;
    static startTimer(strategy, handler, intervalMs, ...handlerArgs) {
        intervalMs = Math.min(Math.max(Math.trunc(intervalMs), MIN_INTERVAL_MS), MAX_INTERVAL_MS);
        const timer = new SetIntervalAsyncTimer();
        timer.#scheduleTimeout(strategy, handler, intervalMs, intervalMs, ...handlerArgs);
        return timer;
    }
    static async stopTimer(timer) {
        timer.#stopped = true;
        if (timer.#timeout) {
            clearTimeout(timer.#timeout);
        }
        if (timer.#promise) {
            await timer.#promise;
        }
    }
    #scheduleTimeout(strategy, handler, intervalMs, delayMs, ...handlerArgs) {
        this.#timeout = setTimeout(async () => {
            this.#timeout = undefined;
            this.#promise = this.#runHandlerAndScheduleTimeout(strategy, handler, intervalMs, ...handlerArgs);
            await this.#promise;
            this.#promise = undefined;
        }, delayMs);
    }
    async #runHandlerAndScheduleTimeout(strategy, handler, intervalMs, ...handlerArgs) {
        const startTimeMs = new Date().getTime();
        try {
            await handler(...handlerArgs);
        }
        finally {
            if (!this.#stopped) {
                const executionTimeMs = new Date().getTime() - startTimeMs;
                const delayMs = strategy === "dynamic"
                    ? intervalMs > executionTimeMs
                        ? intervalMs - executionTimeMs
                        : 0
                    : intervalMs;
                this.#scheduleTimeout(strategy, handler, intervalMs, delayMs, ...handlerArgs);
            }
        }
    }
}
exports.SetIntervalAsyncTimer = SetIntervalAsyncTimer;
