import { WorkflowJobResult } from './types';
import { ExpoGraphqlClient } from '../context/contextUtils/createGraphqlClient';
export declare function fetchRawLogsForCustomJobAsync(job: WorkflowJobResult): Promise<string | null>;
export declare function fetchRawLogsForBuildJobAsync(state: {
    graphqlClient: ExpoGraphqlClient;
}, job: WorkflowJobResult): Promise<string | null>;
