"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abridgedDiff = abridgedDiff;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const diff_1 = require("diff");
const log_1 = tslib_1.__importDefault(require("../log"));
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
function abridgedDiff(str1, str2, contextLines = 2) {
    const changes = (0, diff_1.diffLines)(str1, str2);
    const output = [];
    let lineNumberOriginal = 1;
    let lineNumberModified = 1;
    let currentChunk = [];
    let currentChunkPriorContext = [];
    let currentChunkAfterContext = [];
    let startOriginal = null; // Start line in the original for the current chunk
    let startModified = null; // Start line in the modified for the current chunk
    let addedLines = 0;
    let removedLines = 0;
    const flushChunk = () => {
        if (currentChunk.length > 0) {
            const contextLines = currentChunkPriorContext.length + currentChunkAfterContext.length;
            const originalRange = `${(startOriginal ?? 1) - currentChunkPriorContext.length},${contextLines + removedLines}`;
            const modifiedRange = `${(startModified ?? 1) - currentChunkPriorContext.length},${contextLines + addedLines}`;
            // `git diff` style header
            output.push(chalk_1.default.cyan(`@@ -${originalRange} +${modifiedRange} @@`));
            output.push(...currentChunkPriorContext);
            output.push(...currentChunk);
            output.push(...currentChunkAfterContext);
            currentChunk = [];
            currentChunkPriorContext = [];
            currentChunkAfterContext = [];
            addedLines = 0;
            removedLines = 0;
        }
    };
    for (const change of changes) {
        const lines = change.value.split('\n').filter(line => line);
        if (change.added || change.removed) {
            // Initialize start lines for the chunk if not already set
            if (startOriginal === null) {
                startOriginal = lineNumberOriginal;
            }
            if (startModified === null) {
                startModified = lineNumberModified;
            }
            if (change.removed) {
                lines.forEach(line => {
                    currentChunk.push(`${chalk_1.default.red(`-${line}`)}`);
                    lineNumberOriginal++;
                    removedLines++;
                });
            }
            if (change.added) {
                lines.forEach(line => {
                    currentChunk.push(`${chalk_1.default.green(`+${line}`)}`);
                    lineNumberModified++;
                    addedLines++;
                });
            }
        }
        else {
            // Unchanged lines (context)
            lines.forEach((line, i) => {
                if (currentChunk.length > 0) {
                    // Add leading context after a change
                    if (i < contextLines) {
                        currentChunkAfterContext.push(` ${chalk_1.default.gray(line)}`);
                    }
                }
                else {
                    // Add trailing context before a change
                    if (lines.length - 1 - contextLines < i) {
                        currentChunkPriorContext.push(` ${chalk_1.default.gray(line)}`);
                    }
                }
                const isFinalLineOfAfterContext = i === contextLines - 1 || i === lines.length - 1;
                if (currentChunk.length > 0 && isFinalLineOfAfterContext) {
                    flushChunk();
                }
                lineNumberOriginal++;
                lineNumberModified++;
            });
            startOriginal = null;
            startModified = null;
        }
    }
    flushChunk(); // Flush any remaining chunk
    log_1.default.log(output.join('\n'));
}
