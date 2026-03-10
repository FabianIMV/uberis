import ContextField, { ContextOptions } from './ContextField';
import { ExpoGraphqlClient } from './contextUtils/createGraphqlClient';
import { LoggedInAuthenticationInfo } from '../../user/SessionManager';
import { Actor } from '../../user/User';
import FeatureGating from '../gating/FeatureGating';
export type DynamicLoggedInContextFn = () => Promise<{
    actor: Actor;
    featureGating: FeatureGating;
    graphqlClient: ExpoGraphqlClient;
    authenticationInfo: LoggedInAuthenticationInfo;
}>;
export default class DynamicLoggedInContextField extends ContextField<DynamicLoggedInContextFn> {
    getValueAsync({ nonInteractive, sessionManager, }: ContextOptions): Promise<DynamicLoggedInContextFn>;
}
