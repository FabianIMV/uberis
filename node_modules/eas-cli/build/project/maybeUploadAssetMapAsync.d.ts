import { ExpoGraphqlClient } from '../commandUtils/context/contextUtils/createGraphqlClient';
import { AssetMapSourceInput } from '../graphql/generated';
export declare function maybeUploadAssetMapAsync(distRoot: string, graphqlClient: ExpoGraphqlClient): Promise<AssetMapSourceInput | null>;
