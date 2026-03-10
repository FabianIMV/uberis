import ContextField, { ContextOptions } from './ContextField';
export declare class ProjectIdContextField extends ContextField<string> {
    getValueAsync({ nonInteractive, sessionManager }: ContextOptions): Promise<string>;
}
