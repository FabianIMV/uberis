import { z } from 'zod';
import { DefaultEnvironment } from '../../build/utils/environment';
export declare const WorkflowDispatchInputZ: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodOptional<z.ZodDefault<z.ZodLiteral<"string">>>;
    default: z.ZodOptional<z.ZodCodec<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodString>>;
    description: z.ZodOptional<z.ZodCodec<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodString>>;
    required: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodCodec<z.ZodNumber, z.ZodBoolean>, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"boolean">;
    default: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodCodec<z.ZodNumber, z.ZodBoolean>, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>;
    description: z.ZodOptional<z.ZodCodec<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodString>>;
    required: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodCodec<z.ZodNumber, z.ZodBoolean>, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"number">;
    default: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodCodec<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodString>>;
    required: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodCodec<z.ZodNumber, z.ZodBoolean>, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"choice">;
    default: z.ZodOptional<z.ZodCodec<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodString>>;
    options: z.ZodArray<z.ZodCodec<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodString>>;
    description: z.ZodOptional<z.ZodCodec<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodString>>;
    required: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodCodec<z.ZodNumber, z.ZodBoolean>, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"environment">;
    default: z.ZodOptional<z.ZodEnum<{
        development: DefaultEnvironment.Development;
        preview: DefaultEnvironment.Preview;
        production: DefaultEnvironment.Production;
    }>>;
    description: z.ZodOptional<z.ZodCodec<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodString>>;
    required: z.ZodOptional<z.ZodDefault<z.ZodUnion<readonly [z.ZodBoolean, z.ZodCodec<z.ZodNumber, z.ZodBoolean>, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>>;
}, z.core.$strip>], "type">;
export declare function parseInputs(inputFlags: string[]): Record<string, string>;
export declare function parseJsonInputs(jsonString: string): Record<string, string>;
export declare function parseWorkflowInputsFromYaml(yamlConfig: string): Record<string, z.infer<typeof WorkflowDispatchInputZ>>;
export declare function maybePromptForMissingInputsAsync({ inputSpecs, inputs, }: {
    inputSpecs: Record<string, z.infer<typeof WorkflowDispatchInputZ>>;
    inputs: Record<string, unknown>;
}): Promise<Record<string, unknown>>;
