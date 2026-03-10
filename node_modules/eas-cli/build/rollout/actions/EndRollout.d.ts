import { EASUpdateAction, EASUpdateContext } from '../../eas-update/utils';
import { UpdateChannelBasicInfoFragment } from '../../graphql/generated';
export declare enum EndOutcome {
    REPUBLISH_AND_REVERT = "republish-and-revert",
    REVERT = "revert"
}
export type GeneralOptions = {
    privateKeyPath: string | null;
};
export type NonInteractiveOptions = {
    outcome: EndOutcome;
};
/**
 * End an existing rollout for the project.
 */
export declare class EndRollout implements EASUpdateAction<UpdateChannelBasicInfoFragment> {
    private readonly channelInfo;
    private readonly options;
    constructor(channelInfo: UpdateChannelBasicInfoFragment, options: Partial<NonInteractiveOptions> & GeneralOptions);
    runAsync(ctx: EASUpdateContext): Promise<UpdateChannelBasicInfoFragment>;
    private getChannelObjectAsync;
    private selectOutcomeAsync;
    private performOutcomeAsync;
    private confirmOutcomeAsync;
}
