import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { EnvironmentSecretType, EnvironmentVariableVisibility } from '../graphql/generated';
import { RequestedPlatform } from '../platform';
export declare function getProjectEnvironmentVariableEnvironmentsAsync(graphqlClient: ExpoGraphqlClient, projectId: string): Promise<string[]>;
export declare function promptVariableTypeAsync(nonInteractive: boolean, initialType?: EnvironmentSecretType): Promise<EnvironmentSecretType>;
export declare function parseVisibility(stringVisibility: 'plaintext' | 'sensitive' | 'secret'): EnvironmentVariableVisibility;
export declare function promptVariableVisibilityAsync(nonInteractive: boolean, selectedVisibility?: EnvironmentVariableVisibility | null): Promise<EnvironmentVariableVisibility>;
type EnvironmentPromptArgs = {
    nonInteractive: boolean;
    selectedEnvironments?: string[];
    graphqlClient?: ExpoGraphqlClient;
    projectId?: string;
    canEnterCustomEnvironment?: boolean;
};
export declare function promptVariableEnvironmentAsync(input: EnvironmentPromptArgs & {
    multiple: true;
}): Promise<string[]>;
export declare function promptVariableEnvironmentAsync(input: EnvironmentPromptArgs & {
    multiple?: false;
}): Promise<string>;
export declare function promptVariableValueAsync({ nonInteractive, required, hidden, filePath, initial, }: {
    nonInteractive: boolean;
    required?: boolean;
    initial?: string | null;
    filePath?: boolean;
    hidden?: boolean;
}): Promise<string>;
export declare function promptVariableNameAsync(nonInteractive: boolean, initialValue?: string): Promise<string>;
export declare function promptPlatformAsync({ message, }: {
    message: string;
}): Promise<RequestedPlatform>;
export {};
