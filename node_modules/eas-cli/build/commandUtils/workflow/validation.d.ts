import { ExpoGraphqlClient } from '../context/contextUtils/createGraphqlClient';
export declare function validateWorkflowFileAsync(workflowFileContents: {
    yamlConfig: string;
    filePath: string;
}, projectDir: string, graphqlClient: ExpoGraphqlClient, projectId: string): Promise<void>;
export declare function logWorkflowValidationErrors(error: unknown): void;
export declare function workflowContentsFromParsedYaml(parsedYaml: any): string;
