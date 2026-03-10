import { EASUpdateAction, EASUpdateContext } from '../../eas-update/utils';
import { UpdateBranchBasicInfoFragment } from '../../graphql/generated';
/**
 * Select a runtime from a branch
 */
export declare class SelectRuntime implements EASUpdateAction<string | null> {
    private readonly branchInfo;
    private readonly options;
    private readonly printedType;
    constructor(branchInfo: UpdateBranchBasicInfoFragment, options?: {
        anotherBranchToIntersectRuntimesBy?: UpdateBranchBasicInfoFragment;
    });
    private warnNoRuntime;
    private formatCantFindRuntime;
    runAsync(ctx: EASUpdateContext): Promise<string | null>;
    private getNewestRuntimeAsync;
    private displayLatestUpdateGroupAsync;
    private selectRuntimesAsync;
}
