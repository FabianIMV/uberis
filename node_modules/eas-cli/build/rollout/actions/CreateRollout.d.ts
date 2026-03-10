import { EASUpdateAction, EASUpdateContext } from '../../eas-update/utils';
import { UpdateChannelBasicInfoFragment } from '../../graphql/generated';
export type NonInteractiveOptions = {
    branchNameToRollout: string;
    percent: number;
    runtimeVersion: string;
};
/**
 * Create a rollout for the project.
 */
export declare class CreateRollout implements EASUpdateAction<UpdateChannelBasicInfoFragment> {
    private readonly channelInfo;
    private readonly options;
    constructor(channelInfo: UpdateChannelBasicInfoFragment, options?: Partial<NonInteractiveOptions>);
    runAsync(ctx: EASUpdateContext): Promise<UpdateChannelBasicInfoFragment>;
    private confirmCreationAsync;
    private getChannelObjectAsync;
    private getLatestUpdateGroupOnBranchAsync;
    private selectRuntimeVersionAsync;
    private selectRuntimeVersionFromAlternativeSourceAsync;
    private selectRuntimeVersionFromProjectConfigAsync;
    private selectBranchAsync;
    private resolveBranchNameAsync;
}
