import { z } from 'zod';
export declare const FunctionStepZ: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    working_directory: z.ZodOptional<z.ZodString>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    __metrics_id: z.ZodOptional<z.ZodString>;
    uses: z.ZodString;
    with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    run: z.ZodOptional<z.ZodNever>;
    shell: z.ZodOptional<z.ZodNever>;
    outputs: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>;
export type FunctionStep = z.infer<typeof FunctionStepZ>;
export declare const ShellStepZ: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    working_directory: z.ZodOptional<z.ZodString>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    __metrics_id: z.ZodOptional<z.ZodString>;
    run: z.ZodString;
    shell: z.ZodOptional<z.ZodString>;
    outputs: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodCodec<z.ZodString, z.ZodObject<{
        name: z.ZodString;
        required: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>, z.ZodObject<{
        name: z.ZodString;
        required: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>>;
    uses: z.ZodOptional<z.ZodNever>;
    with: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>;
export type ShellStep = z.infer<typeof ShellStepZ>;
export declare const StepZ: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    working_directory: z.ZodOptional<z.ZodString>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    __metrics_id: z.ZodOptional<z.ZodString>;
    run: z.ZodString;
    shell: z.ZodOptional<z.ZodString>;
    outputs: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodCodec<z.ZodString, z.ZodObject<{
        name: z.ZodString;
        required: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>, z.ZodObject<{
        name: z.ZodString;
        required: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>>;
    uses: z.ZodOptional<z.ZodNever>;
    with: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    working_directory: z.ZodOptional<z.ZodString>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    __metrics_id: z.ZodOptional<z.ZodString>;
    uses: z.ZodString;
    with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    run: z.ZodOptional<z.ZodNever>;
    shell: z.ZodOptional<z.ZodNever>;
    outputs: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>]>;
/**
 * Structure of a custom EAS job step.
 *
 * GHA step fields skipped here:
 * - `with.entrypoint`
 * - `continue-on-error`
 * - `timeout-minutes`
 *
 * * @example
 * steps:
 *  - uses: eas/maestro-test
 *    id: step1
 *    name: Step 1
 *    with:
 *      flow_path: |
 *        maestro/sign_in.yaml
 *        maestro/create_post.yaml
 *        maestro/sign_out.yaml
 *  - run: echo Hello, world!
 */
export type Step = z.infer<typeof StepZ>;
export declare function validateSteps(maybeSteps: unknown): Step[];
export declare function isStepShellStep(step: Step): step is ShellStep;
export declare function isStepFunctionStep(step: Step): step is FunctionStep;
