"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCRIPTS_PATH = void 0;
exports.serializeInputs = serializeInputs;
exports.deserializeInputs = deserializeInputs;
exports.createCustomFunctionCall = createCustomFunctionCall;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const spawn_1 = require("./shell/spawn");
exports.SCRIPTS_PATH = path_1.default.join(__dirname, '../../dist/scripts');
function serializeInputs(inputs) {
    return Object.fromEntries(Object.entries(inputs).map(([id, input]) => [
        id,
        { serializedValue: input === undefined ? undefined : JSON.stringify(input.value) },
    ]));
}
function deserializeInputs(inputs) {
    return Object.fromEntries(Object.entries(inputs).map(([id, { serializedValue }]) => [
        id,
        { value: serializedValue === undefined ? undefined : JSON.parse(serializedValue) },
    ]));
}
function createCustomFunctionCall(rawCustomFunctionModulePath) {
    return async (ctx, { env, inputs, outputs }) => {
        let customFunctionModulePath = rawCustomFunctionModulePath;
        if (!(await fs_extra_1.default.exists(ctx.global.projectSourceDirectory))) {
            const relative = path_1.default.relative(path_1.default.resolve(ctx.global.projectSourceDirectory), customFunctionModulePath);
            customFunctionModulePath = path_1.default.resolve(path_1.default.join(ctx.global.projectTargetDirectory, relative));
        }
        const serializedArguments = {
            env,
            inputs: serializeInputs(inputs),
            outputs: Object.fromEntries(Object.entries(outputs).map(([id, output]) => [id, output.serialize()])),
            ctx: ctx.serialize(),
        };
        try {
            await (0, spawn_1.spawnAsync)('node', [
                path_1.default.join(exports.SCRIPTS_PATH, 'runCustomFunction.js'),
                customFunctionModulePath,
                JSON.stringify(serializedArguments),
            ], {
                logger: ctx.logger,
                cwd: ctx.workingDirectory,
                env,
                stdio: 'pipe',
            });
        }
        catch {
            throw new Error(`Custom function exited with non-zero exit code.`);
        }
    };
}
