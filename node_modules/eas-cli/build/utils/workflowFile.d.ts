import { CombinedError } from '@urql/core';
export declare namespace WorkflowFile {
    function readWorkflowFileContentsAsync({ projectDir, filePath, }: {
        projectDir: string;
        filePath: string;
    }): Promise<{
        yamlConfig: string;
        filePath: string;
    }>;
    function maybePrintWorkflowFileValidationErrors({ error, }: {
        error: CombinedError;
    }): void;
    function validateYamlExtension(fileName: string): void;
}
