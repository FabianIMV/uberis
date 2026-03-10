import { NonInteractiveOptions as CreateRolloutNonInteractiveOptions } from './CreateRollout';
import { NonInteractiveOptions as EditRolloutNonInteractiveOptions } from './EditRollout';
import { GeneralOptions as EndRolloutGeneralOptions, NonInteractiveOptions as EndRolloutNonInteractiveOptions } from './EndRollout';
import { RolloutActions } from './RolloutMainMenu';
import { EASUpdateAction, EASUpdateContext } from '../../eas-update/utils';
/**
 * Control a rollout in non interactive mode.
 */
export declare class NonInteractiveRollout implements EASUpdateAction<void> {
    private readonly options;
    constructor(options: {
        channelName?: string;
        json?: boolean;
        action?: RolloutActions;
    } & Partial<EditRolloutNonInteractiveOptions> & Partial<EndRolloutNonInteractiveOptions> & EndRolloutGeneralOptions & Partial<CreateRolloutNonInteractiveOptions>);
    runAsync(ctx: EASUpdateContext): Promise<void>;
    private runActionAsync;
    private viewRollout;
    private getJsonAsync;
    private getRolloutJsonAsync;
    private getRuntimeVersion;
    private getChannelObjectAsync;
}
