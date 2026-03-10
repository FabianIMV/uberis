import { JobInterpolationContext } from '@expo/eas-build-job';
import { BuildStepGlobalContext } from './BuildStepContext';
export declare enum BuildStepInputValueTypeName {
    STRING = "string",
    BOOLEAN = "boolean",
    NUMBER = "number",
    JSON = "json"
}
export type BuildStepInputValueType<T extends BuildStepInputValueTypeName = BuildStepInputValueTypeName> = T extends BuildStepInputValueTypeName.STRING ? string : T extends BuildStepInputValueTypeName.BOOLEAN ? boolean : T extends BuildStepInputValueTypeName.NUMBER ? number : Record<string, unknown>;
export type BuildStepInputById = Record<string, BuildStepInput>;
export type BuildStepInputProvider = (ctx: BuildStepGlobalContext, stepId: string) => BuildStepInput;
interface BuildStepInputProviderParams<T extends BuildStepInputValueTypeName = BuildStepInputValueTypeName, R extends boolean = boolean> {
    id: string;
    allowedValues?: unknown[];
    defaultValue?: unknown;
    required: R;
    allowedValueTypeName: T;
}
interface BuildStepInputParams<T extends BuildStepInputValueTypeName, R extends boolean> extends BuildStepInputProviderParams<T, R> {
    stepDisplayName: string;
}
export declare class BuildStepInput<T extends BuildStepInputValueTypeName = BuildStepInputValueTypeName, R extends boolean = boolean> {
    private readonly ctx;
    readonly id: string;
    readonly stepDisplayName: string;
    readonly defaultValue?: unknown;
    readonly allowedValues?: unknown[];
    readonly allowedValueTypeName: T;
    readonly required: R;
    private _value?;
    static createProvider(params: BuildStepInputProviderParams): BuildStepInputProvider;
    constructor(ctx: BuildStepGlobalContext, { id, stepDisplayName, allowedValues, defaultValue, required, allowedValueTypeName, }: BuildStepInputParams<T, R>);
    getValue({ interpolationContext, }: {
        interpolationContext: JobInterpolationContext;
    }): R extends true ? BuildStepInputValueType<T> : BuildStepInputValueType<T> | undefined;
    get rawValue(): unknown;
    set(value: unknown): BuildStepInput;
    isRawValueOneOfAllowedValues(): boolean;
    isRawValueStepOrContextReference(): boolean;
    private parseInputValueToAllowedType;
    private parseInputValueToString;
    private parseInputValueToNumber;
    private parseInputValueToBoolean;
    private parseInputValueToObject;
}
export declare function makeBuildStepInputByIdMap(inputs?: BuildStepInput[]): BuildStepInputById;
export {};
