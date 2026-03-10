import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { EnvironmentVariableFragment } from '../generated';
type EnvironmentVariableWithLinkedEnvironments = EnvironmentVariableFragment & {
    linkedEnvironments?: string[] | null;
};
export type EnvironmentVariableWithFileContent = EnvironmentVariableFragment & {
    valueWithFileContent?: string | null | undefined;
};
export declare const EnvironmentVariablesQuery: {
    environmentVariableEnvironmentsAsync(graphqlClient: ExpoGraphqlClient, appId: string): Promise<string[]>;
    byAppIdWithSensitiveAsync(graphqlClient: ExpoGraphqlClient, { appId, environment, filterNames, includeFileContent, }: {
        appId: string;
        environment?: string;
        filterNames?: string[];
        includeFileContent?: boolean;
    }): Promise<EnvironmentVariableWithFileContent[]>;
    byAppIdAsync(graphqlClient: ExpoGraphqlClient, { appId, environment, filterNames, includeFileContent, }: {
        appId: string;
        environment?: string;
        filterNames?: string[];
        includeFileContent?: boolean;
    }): Promise<(EnvironmentVariableWithFileContent & EnvironmentVariableWithLinkedEnvironments)[]>;
    sharedAsync(graphqlClient: ExpoGraphqlClient, { appId, filterNames, environment, includeFileContent, }: {
        appId: string;
        filterNames?: string[];
        environment?: string;
        includeFileContent?: boolean;
    }): Promise<(EnvironmentVariableWithFileContent & EnvironmentVariableWithLinkedEnvironments)[]>;
    sharedWithSensitiveAsync(graphqlClient: ExpoGraphqlClient, { appId, filterNames, environment, includeFileContent, }: {
        appId: string;
        filterNames?: string[];
        environment?: string;
        includeFileContent?: boolean;
    }): Promise<EnvironmentVariableWithFileContent[]>;
};
export {};
