import ContextField, { ContextOptions } from './ContextField';
import { ExpoGraphqlClient } from './contextUtils/createGraphqlClient';
import { LoggedInAuthenticationInfo } from '../../user/SessionManager';
import { Actor } from '../../user/User';
import FeatureGating from '../gating/FeatureGating';
type LoggedInContextType = {
    actor: Actor;
    featureGating: FeatureGating;
    graphqlClient: ExpoGraphqlClient;
    authenticationInfo: LoggedInAuthenticationInfo;
};
export default class LoggedInContextField extends ContextField<LoggedInContextType> {
    getValueAsync({ nonInteractive, sessionManager, }: ContextOptions): Promise<LoggedInContextType>;
}
export {};
