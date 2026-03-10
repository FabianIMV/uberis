export declare function runGitCloneAsync({ targetProjectDir, githubRepositoryName, githubUsername, cloneMethod, showOutput, }: {
    githubUsername: string;
    githubRepositoryName: string;
    targetProjectDir: string;
    cloneMethod: 'ssh' | 'https';
    showOutput?: boolean;
}): Promise<{
    targetProjectDir: string;
}>;
export declare function runGitPushAsync({ targetProjectDir, }: {
    targetProjectDir: string;
}): Promise<void>;
export declare function canAccessRepositoryUsingSshAsync({ githubUsername, githubRepositoryName, }: {
    githubUsername: string;
    githubRepositoryName: string;
}): Promise<boolean>;
