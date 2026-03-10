import { ExpoConfig } from '@expo/config';
import ContextField, { ContextOptions } from './ContextField';
export declare class PrivateProjectConfigContextField extends ContextField<{
    projectId: string;
    exp: ExpoConfig;
    projectDir: string;
}> {
    getValueAsync({ nonInteractive, sessionManager, withServerSideEnvironment, }: ContextOptions): Promise<{
        projectId: string;
        exp: ExpoConfig;
        projectDir: string;
    }>;
}
