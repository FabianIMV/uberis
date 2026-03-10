import { ExpoConfig } from '@expo/config';
import { UpdatePublishPlatform } from './utils';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { UpdateFragment } from '../graphql/generated';
import { CodeSigningInfo } from '../utils/code-signing';
export type UpdateToRepublish = {
    groupId: string;
    branchId: string;
    branchName: string;
} & UpdateFragment;
/**
 * @param updatesToPublish The update group to republish
 * @param targetBranch The branch to repubish the update group on
 */
export declare function republishAsync({ graphqlClient, app, updatesToPublish, targetBranch, updateMessage, codeSigningInfo, json, rolloutPercentage, }: {
    graphqlClient: ExpoGraphqlClient;
    app: {
        exp: ExpoConfig;
        projectId: string;
    };
    updatesToPublish: UpdateToRepublish[];
    targetBranch: {
        branchName: string;
        branchId: string;
    };
    updateMessage: string;
    codeSigningInfo?: CodeSigningInfo;
    json?: boolean;
    rolloutPercentage?: number;
}): Promise<void>;
type GetUpdateOrAskForUpdatesOptions = {
    nonInteractive: boolean;
    json: boolean;
    groupId?: string;
    branchName?: string;
    channelName?: string;
};
export declare function getUpdateGroupAsync(graphqlClient: ExpoGraphqlClient, groupId: string): Promise<UpdateToRepublish[]>;
type AskUpdateGroupForEachPublishPlatformFilteringByRuntimeVersionOptions = {
    nonInteractive: boolean;
    json: boolean;
    branchName?: string;
    channelName?: string;
};
export declare function askUpdateGroupForEachPublishPlatformFilteringByRuntimeVersionAsync(graphqlClient: ExpoGraphqlClient, projectId: string, options: AskUpdateGroupForEachPublishPlatformFilteringByRuntimeVersionOptions): Promise<Record<UpdatePublishPlatform, UpdateToRepublish[] | undefined>>;
export declare function getUpdateGroupOrAskForUpdateGroupAsync(graphqlClient: ExpoGraphqlClient, projectId: string, options: GetUpdateOrAskForUpdatesOptions): Promise<UpdateToRepublish[]>;
type GetOrAskUpdateMessageOptions = {
    updateMessage?: string;
    nonInteractive: boolean;
    json: boolean;
};
/**
 * Get or ask the user for the update (group) message for the republish
 */
export declare function getOrAskUpdateMessageAsync(updateGroup: UpdateToRepublish[], options: GetOrAskUpdateMessageOptions): Promise<string>;
export {};
