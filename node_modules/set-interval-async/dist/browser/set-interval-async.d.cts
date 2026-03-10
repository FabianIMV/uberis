import { clearIntervalAsync } from "../clear-interval-async.cjs";
import { setIntervalAsync as setIntervalAsyncDynamic } from "../dynamic/set-interval-async.cjs";
import { setIntervalAsync as setIntervalAsyncFixed } from "../fixed/set-interval-async.cjs";
declare const setIntervalAsync: typeof setIntervalAsyncDynamic;
declare const dynamic: {
    setIntervalAsync: typeof setIntervalAsyncDynamic;
};
declare const fixed: {
    setIntervalAsync: typeof setIntervalAsyncFixed;
};
export { setIntervalAsync, clearIntervalAsync, dynamic, fixed };
