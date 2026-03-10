import { Ignore as SingleFileIgnore } from 'ignore';
export declare const EASIGNORE_FILENAME = ".easignore";
/**
 * Ignore wraps the 'ignore' package to support multiple .gitignore files
 * in subdirectories.
 *
 * Inconsistencies with git behavior:
 * - if parent .gitignore has ignore rule and child has exception to that rule,
 *   file will still be ignored,
 * - node_modules is always ignored,
 * - if .easignore exists, .gitignore files are not used.
 */
export declare class Ignore {
    private readonly rootDir;
    ignoreMapping: (readonly [string, SingleFileIgnore])[];
    private constructor();
    static createForCopyingAsync(rootDir: string): Promise<Ignore>;
    /** Does not include the default .git and node_modules ignore rules. */
    static createForCheckingAsync(rootDir: string): Promise<Ignore>;
    initIgnoreAsync({ defaultIgnore }: {
        defaultIgnore: string;
    }): Promise<void>;
    ignores(relativePath: string): boolean;
}
export declare function makeShallowCopyAsync(_src: string, dst: string): Promise<void>;
