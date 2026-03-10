import { NonInteractiveOptions as CreateRolloutNonInteractiveOptions } from './CreateRollout';
import { NonInteractiveOptions as EditRolloutNonInteractiveOptions } from './EditRollout';
import { GeneralOptions as EndRolloutGeneralOptions, NonInteractiveOptions as EndRolloutNonInteractiveOptions } from './EndRollout';
import { ManageRolloutActions } from './ManageRollout';
import { EASUpdateAction, EASUpdateContext } from '../../eas-update/utils';
export declare enum MainMenuActions {
    CREATE_NEW = "Create a new rollout",
    MANAGE_EXISTING = "Manage an existing rollout"
}
export type RolloutActions = MainMenuActions.CREATE_NEW | ManageRolloutActions.EDIT | ManageRolloutActions.END | ManageRolloutActions.VIEW;
/**
 * Manage a rollout for the project.
 */
export declare class RolloutMainMenu implements EASUpdateAction<void> {
    private readonly options;
    constructor(options: {
        channelName?: string;
        action?: RolloutActions;
    } & Partial<EditRolloutNonInteractiveOptions> & Partial<EndRolloutNonInteractiveOptions> & EndRolloutGeneralOptions & Partial<CreateRolloutNonInteractiveOptions>);
    runAsync(ctx: EASUpdateContext): Promise<void>;
    private runActionAsync;
    private selectRolloutAsync;
    private selectChannelToRolloutAsync;
    private resolveChannelNameAsync;
    private toMainMenuAction;
    private promptMenuActionAsync;
}
