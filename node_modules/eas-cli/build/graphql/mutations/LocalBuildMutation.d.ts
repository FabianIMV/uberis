import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { BuildFragment, BuildMetadataInput, LocalBuildArchiveSourceInput, LocalBuildJobInput } from '../generated';
export declare const LocalBuildMutation: {
    createLocalBuildAsync(graphqlClient: ExpoGraphqlClient, appId: string, job: LocalBuildJobInput, artifactSource: LocalBuildArchiveSourceInput, metadata: BuildMetadataInput): Promise<BuildFragment>;
};
