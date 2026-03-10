import { Client } from '../vcs/vcs';
export declare function getDefaultBranchNameAsync(vcsClient: Client): Promise<string | null>;
export declare class BranchNotFoundError extends Error {
    constructor(message?: string);
}
