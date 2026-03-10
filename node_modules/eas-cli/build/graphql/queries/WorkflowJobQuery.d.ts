import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { WorkflowJobByIdQuery } from '../generated';
export declare const WorkflowJobQuery: {
    byIdAsync(graphqlClient: ExpoGraphqlClient, workflowJobId: string, { useCache }?: {
        useCache?: boolean;
    }): Promise<WorkflowJobByIdQuery["workflowJobs"]["byId"]>;
};
