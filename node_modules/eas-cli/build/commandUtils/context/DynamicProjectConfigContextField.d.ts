import { ExpoConfig } from '@expo/config';
import ContextField, { ContextOptions } from './ContextField';
import { ExpoConfigOptions } from '../../project/expoConfig';
export type DynamicConfigContextFn = (options?: ExpoConfigOptions) => Promise<{
    projectId: string;
    exp: ExpoConfig;
    projectDir: string;
}>;
export declare class DynamicPublicProjectConfigContextField extends ContextField<DynamicConfigContextFn> {
    getValueAsync({ nonInteractive, sessionManager, withServerSideEnvironment, }: ContextOptions): Promise<DynamicConfigContextFn>;
}
export declare class DynamicPrivateProjectConfigContextField extends ContextField<DynamicConfigContextFn> {
    getValueAsync({ nonInteractive, sessionManager, withServerSideEnvironment, }: ContextOptions): Promise<DynamicConfigContextFn>;
}
