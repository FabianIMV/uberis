/**
 * Computes and prints a line-based diff between two strings, displaying changes as chunks.
 *
 * Each chunk contains lines that were added or removed, prefixed with contextual lines
 * from the unchanged parts of the strings. The output is styled similarly to `git diff`
 * with headers indicating line ranges for the changes in the original and modified strings.
 *
 * @param {string} str1 - The original string to compare.
 * @param {string} str2 - The modified string to compare against the original.
 * @param {number} [contextLines=2] - The number of unchanged lines to display before and after each chunk of changes.
 *
 * ### Output:
 * - Each chunk begins with a header in the format `@@ -<original range> +<modified range> @@`.
 * - Removed lines are prefixed with a red `-` and the original line number.
 * - Added lines are prefixed with a green `+` and the modified line number.
 * - Context lines are displayed in gray without a `+` or `-` prefix.
 *
 * ### Notes:
 * - Consecutive changes are grouped into a single chunk if separated by no more than the specified number of context lines.
 *
 * ### Example:
 * ```typescript
 * abridgedDiff("Line1\nLine2\nLine3", "Line1\nLineX\nLine3", 1);
 *
 * Output:
 * `@@ -2,1 +2,1 @@`
 * Line1
 * -Line2
 * +LineX
 * Line3
 * ```
 */
export declare function abridgedDiff(str1: string, str2: string, contextLines?: number): void;
