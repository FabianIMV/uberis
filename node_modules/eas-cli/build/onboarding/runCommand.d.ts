export declare function runCommandAsync({ cwd, args, command, shouldShowStderrLine, shouldPrintStderrLineAsStdout, showSpinner, showOutput, }: {
    cwd?: string;
    args: string[];
    command: string;
    shouldShowStderrLine?: (line: string) => boolean;
    shouldPrintStderrLineAsStdout?: (line: string) => boolean;
    showSpinner?: boolean;
    showOutput?: boolean;
}): Promise<void>;
