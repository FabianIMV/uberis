import { Client } from '../vcs';
export default class NoVcsClient extends Client {
    private readonly cwdOverride?;
    constructor(options?: {
        cwdOverride?: string;
    });
    getRootPathAsync(): Promise<string>;
    makeShallowCopyAsync(destinationPath: string): Promise<void>;
    isFileIgnoredAsync(filePath: string): Promise<boolean>;
    canGetLastCommitMessage(): boolean;
}
