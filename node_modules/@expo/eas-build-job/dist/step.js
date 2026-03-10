"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepZ = exports.ShellStepZ = exports.FunctionStepZ = void 0;
exports.validateSteps = validateSteps;
exports.isStepShellStep = isStepShellStep;
exports.isStepFunctionStep = isStepFunctionStep;
const zod_1 = require("zod");
const CommonStepZ = zod_1.z.object({
    /**
     * Unique identifier for the step.
     *
     * @example
     * id: step1
     */
    id: zod_1.z
        .string()
        .optional()
        .describe(`ID of the step. Useful for later referencing the job's outputs. Example: step with id "setup" and an output "platform" will expose its value under "steps.setup.outputs.platform".`),
    /**
     * Expression that determines whether the step should run.
     * Based on the GitHub Actions job step `if` field (https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsif).
     */
    if: zod_1.z.string().optional().describe('Expression that determines whether the step should run.'),
    /**
     * The name of the step.
     *
     * @example
     * name: 'Step 1'
     */
    name: zod_1.z.string().optional().describe('Name of the step.'),
    /**
     * The working directory to run the step in.
     *
     * @example
     * working_directory: ./my-working-directory
     *
     * @default depends on the project settings
     */
    working_directory: zod_1.z
        .string()
        .optional()
        .describe(`Working directory to run the step in. Relative paths like "./assets" or "assets" are resolved from the app's base directory. Absolute paths like "/apps/mobile" are resolved from the repository root.`),
    /**
     * Env variables override for the step.
     *
     * @example
     * env:
     *   MY_ENV_VAR: my-value
     *   ANOTHER_ENV_VAR: another-value
     */
    env: zod_1.z
        .record(zod_1.z.string(), zod_1.z.string())
        .optional()
        .describe('Additional environment variables to set for the step.'),
    // Internal field for metrics collection. Not documented publicly.
    // YAML uses snake_case, but we transform to camelCase for internal use.
    __metrics_id: zod_1.z.string().optional(),
});
exports.FunctionStepZ = CommonStepZ.extend({
    /**
     * The custom EAS function to run as a step.
     * It can be a function provided by EAS or a custom function defined by the user.
     *
     * @example
     * uses: eas/build
     *
     * @example
     * uses: my-custom-function
     */
    uses: zod_1.z
        .string()
        .describe('Name of the function to use for this step. See https://docs.expo.dev/custom-builds/schema/#built-in-eas-functions for available functions.'),
    /**
     * The arguments to pass to the function.
     *
     * @example
     * with:
     *   arg1: value1
     *   arg2: ['ala', 'ma', 'kota']
     *   arg3:
     *     key1: value1
     *     key2:
     *      - value1
     *   arg4: ${{ steps.step1.outputs.test }}
     */
    with: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional().describe('Inputs to the function.'),
    run: zod_1.z.never().optional(),
    shell: zod_1.z.never().optional(),
    outputs: zod_1.z.never().optional(),
});
exports.ShellStepZ = CommonStepZ.extend({
    /**
     * The command-line programs to run as a step.
     *
     * @example
     * run: echo Hello, world!
     *
     * @example
     * run: |
     *  npm install
     *  npx expo prebuild
     *  pod install
     */
    run: zod_1.z.string().describe('Shell script to run in the step.'),
    /**
     * The shell to run the "run" command with.
     *
     * @example
     * shell: 'sh'
     *
     * @default 'bash'
     */
    shell: zod_1.z.string().optional().describe('Shell to run the "run" command with.'),
    /**
     * The outputs of the step.
     *
     * @example
     * outputs:
     *  - name: my_output
     *    required: true
     *  - name: my_optional_output
     *    required: false
     *  - name: my_optional_output_without_required
     */
    outputs: zod_1.z
        .array(zod_1.z.union([
        // We allow a shorthand for outputs
        zod_1.z.codec(zod_1.z.string(), zod_1.z.object({ name: zod_1.z.string(), required: zod_1.z.boolean().default(false) }), {
            decode: name => ({ name, required: false }),
            encode: output => output.name,
        }),
        zod_1.z.object({
            name: zod_1.z.string(),
            required: zod_1.z.boolean().optional(),
        }),
    ]))
        .optional(),
    uses: zod_1.z.never().optional(),
    with: zod_1.z.never().optional(),
});
exports.StepZ = zod_1.z.union([exports.ShellStepZ, exports.FunctionStepZ]);
function validateSteps(maybeSteps) {
    const steps = zod_1.z.array(exports.StepZ).min(1).parse(maybeSteps);
    return steps;
}
function isStepShellStep(step) {
    return step.run !== undefined;
}
function isStepFunctionStep(step) {
    return step.uses !== undefined;
}
