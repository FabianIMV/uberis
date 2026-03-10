import { Client } from '../vcs';
export default class GitClient extends Client {
    private readonly maybeCwdOverride?;
    requireCommit: boolean;
    constructor(options: {
        maybeCwdOverride?: string;
        requireCommit: boolean;
    });
    ensureRepoExistsAsync(): Promise<void>;
    commitAsync({ commitMessage, commitAllFiles, nonInteractive, }: {
        commitMessage: string;
        commitAllFiles?: boolean;
        nonInteractive: boolean;
    }): Promise<void>;
    showChangedFilesAsync(): Promise<void>;
    hasUncommittedChangesAsync(): Promise<boolean>;
    getRootPathAsync(): Promise<string>;
    isCommitRequiredAsync(): Promise<boolean>;
    makeShallowCopyAsync(destinationPath: string): Promise<void>;
    getCommitHashAsync(): Promise<string | undefined>;
    trackFileAsync(file: string): Promise<void>;
    getBranchNameAsync(): Promise<string | null>;
    getLastCommitMessageAsync(): Promise<string | null>;
    showDiffAsync(): Promise<void>;
    isFileUntrackedAsync(path: string): Promise<boolean>;
    /** NOTE: This method does not support checking whether `.git` is ignored by `.easignore` rules. */
    isFileIgnoredAsync(filePath: string): Promise<boolean>;
    canGetLastCommitMessage(): boolean;
    private ensureGitConfiguredAsync;
}
/**
 * Checks if git is configured to be case sensitive
 * @returns {boolean | undefined}
 *    - boolean - is git case sensitive
 *    - undefined - case sensitivity is not configured and git is using default behavior
 */
export declare function isGitCaseSensitiveAsync(cwd: string | undefined): Promise<boolean | undefined>;
