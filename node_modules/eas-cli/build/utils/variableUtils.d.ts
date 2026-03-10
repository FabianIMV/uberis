import { EnvironmentVariableFragment } from '../graphql/generated';
import { EnvironmentVariableWithFileContent } from '../graphql/queries/EnvironmentVariablesQuery';
export declare function formatVariableName(variable: EnvironmentVariableFragment): string;
export declare function formatVariableValue(variable: EnvironmentVariableWithFileContent): string;
export declare function performForEnvironmentsAsync(environments: string[] | null, fun: (environment: string | undefined) => Promise<any>): Promise<any[]>;
export declare function formatVariable(variable: EnvironmentVariableWithFileContent): string;
