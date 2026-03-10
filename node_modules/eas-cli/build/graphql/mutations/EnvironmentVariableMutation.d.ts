import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { CreateEnvironmentVariableInput, CreateSharedEnvironmentVariableInput, EnvironmentVariableFragment, UpdateEnvironmentVariableInput } from '../generated';
export declare const EnvironmentVariableMutation: {
    createSharedVariableAsync(graphqlClient: ExpoGraphqlClient, input: CreateSharedEnvironmentVariableInput, accountId: string): Promise<EnvironmentVariableFragment>;
    createForAppAsync(graphqlClient: ExpoGraphqlClient, input: CreateEnvironmentVariableInput, appId: string): Promise<EnvironmentVariableFragment>;
    updateAsync(graphqlClient: ExpoGraphqlClient, input: UpdateEnvironmentVariableInput): Promise<EnvironmentVariableFragment>;
    deleteAsync(graphqlClient: ExpoGraphqlClient, id: string): Promise<{
        id: string;
    }>;
    createBulkEnvironmentVariablesForAppAsync(graphqlClient: ExpoGraphqlClient, input: CreateEnvironmentVariableInput[], appId: string): Promise<boolean>;
};
