import { SetIntervalAsyncStrategy } from "./set-interval-async-strategy.cjs";
import { SetIntervalAsyncHandler } from "./set-interval-async-handler.cjs";
export declare class SetIntervalAsyncTimer<HandlerArgs extends unknown[]> {
    #private;
    static startTimer<HandlerArgs extends unknown[]>(strategy: SetIntervalAsyncStrategy, handler: SetIntervalAsyncHandler<HandlerArgs>, intervalMs: number, ...handlerArgs: HandlerArgs): SetIntervalAsyncTimer<HandlerArgs>;
    static stopTimer<HandlerArgs extends unknown[]>(timer: SetIntervalAsyncTimer<HandlerArgs>): Promise<void>;
}
