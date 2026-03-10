import ContextField, { ContextOptions } from './ContextField';
import { ExpoGraphqlClient } from './contextUtils/createGraphqlClient';
import { Actor } from '../../user/User';
import FeatureGating from '../gating/FeatureGating';
type MaybeLoggedInContextType = {
    actor: Actor | null;
    featureGating: FeatureGating;
    graphqlClient: ExpoGraphqlClient;
    authenticationInfo: {
        accessToken: string | null;
        sessionSecret: string | null;
    };
};
export default class MaybeLoggedInContextField extends ContextField<MaybeLoggedInContextType> {
    getValueAsync({ sessionManager }: ContextOptions): Promise<MaybeLoggedInContextType>;
}
export {};
