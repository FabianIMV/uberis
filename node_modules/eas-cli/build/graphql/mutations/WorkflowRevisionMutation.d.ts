import { z } from 'zod';
import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { WorkflowRevision } from '../generated';
export declare namespace WorkflowRevisionMutation {
    const ValidationErrorExtensionZ: z.ZodObject<{
        errorCode: z.ZodLiteral<"VALIDATION_ERROR">;
        metadata: z.ZodObject<{
            formErrors: z.ZodArray<z.ZodString>;
            fieldErrors: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    function getOrCreateWorkflowRevisionFromGitRefAsync(graphqlClient: ExpoGraphqlClient, { appId, fileName, gitRef, }: {
        appId: string;
        fileName: string;
        gitRef: string;
    }): Promise<WorkflowRevision | undefined>;
    function validateWorkflowYamlConfigAsync(graphqlClient: ExpoGraphqlClient, { appId, yamlConfig, }: {
        appId: string;
        yamlConfig: string;
    }): Promise<void>;
}
