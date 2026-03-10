import { ExpoConfig } from '@expo/config';
import ContextField, { ContextOptions } from './ContextField';
export declare class OptionalPrivateProjectConfigContextField extends ContextField<{
    projectId: string;
    exp: ExpoConfig;
    projectDir: string;
} | undefined> {
    getValueAsync({ nonInteractive, sessionManager, withServerSideEnvironment, }: ContextOptions): Promise<{
        projectId: string;
        exp: ExpoConfig;
        projectDir: string;
    } | undefined>;
}
