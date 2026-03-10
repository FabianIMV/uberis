import { EASUpdateAction, EASUpdateContext } from '../../eas-update/utils';
import { UpdateChannelBasicInfoFragment } from '../../graphql/generated';
export type NonInteractiveOptions = {
    percent: number;
};
/**
 * Edit an existing rollout for the project.
 */
export declare class EditRollout implements EASUpdateAction<UpdateChannelBasicInfoFragment> {
    private readonly channelInfo;
    private readonly options;
    constructor(channelInfo: UpdateChannelBasicInfoFragment, options?: Partial<NonInteractiveOptions>);
    runAsync(ctx: EASUpdateContext): Promise<UpdateChannelBasicInfoFragment>;
    private confirmEditAsync;
    private getChannelObjectAsync;
}
