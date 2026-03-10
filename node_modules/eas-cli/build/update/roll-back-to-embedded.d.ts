import { ExpoConfig } from '@expo/config';
import { UpdatePublishPlatform } from './utils';
import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { CodeSigningInfo } from '../utils/code-signing';
export declare function publishRollBackToEmbeddedUpdateAsync({ graphqlClient, projectId, exp, updateMessage, branch, codeSigningInfo, platforms, runtimeVersion, json, }: {
    graphqlClient: ExpoGraphqlClient;
    projectId: string;
    exp: ExpoConfig;
    updateMessage: string | undefined;
    branch: {
        name: string;
        id: string;
    };
    codeSigningInfo: CodeSigningInfo | undefined;
    platforms: UpdatePublishPlatform[];
    runtimeVersion: string;
    json: boolean;
}): Promise<void>;
