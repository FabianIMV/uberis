import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { AssignAliasMutation, DeleteAliasResult } from '../graphql/generated';
export declare const DeploymentsMutation: {
    createSignedDeploymentUrlAsync(graphqlClient: ExpoGraphqlClient, deploymentVariables: {
        appId: string;
        deploymentIdentifier?: string | null;
    }): Promise<string>;
    assignDevDomainNameAsync(graphqlClient: ExpoGraphqlClient, devDomainNameVariables: {
        appId: string;
        name: string;
    }): Promise<boolean>;
    assignAliasAsync(graphqlClient: ExpoGraphqlClient, aliasVariables: {
        appId: string;
        deploymentId: string;
        aliasName: string | null;
    }): Promise<AssignAliasMutation["deployments"]["assignAlias"]>;
    deleteAliasAsync(graphqlClient: ExpoGraphqlClient, deleteAliasVariables: {
        appId: string;
        aliasName: string;
    }): Promise<DeleteAliasResult>;
    deleteWorkerDeploymentAsync(graphqlClient: ExpoGraphqlClient, deleteVariables: {
        appId: string;
        deploymentIdentifier: string;
    }): Promise<{
        deploymentIdentifier: string;
        id: string;
    }>;
};
