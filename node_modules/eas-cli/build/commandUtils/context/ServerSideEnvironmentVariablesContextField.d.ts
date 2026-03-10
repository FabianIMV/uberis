import ContextField, { ContextOptions } from './ContextField';
export type GetServerSideEnvironmentVariablesFn = (maybeEnv?: Record<string, string>) => Promise<Record<string, string>>;
export declare class ServerSideEnvironmentVariablesContextField extends ContextField<GetServerSideEnvironmentVariablesFn> {
    getValueAsync({ nonInteractive, sessionManager, withServerSideEnvironment, }: ContextOptions): Promise<GetServerSideEnvironmentVariablesFn>;
}
