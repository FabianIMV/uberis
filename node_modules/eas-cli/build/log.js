"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.link = link;
exports.learnMore = learnMore;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const figures_1 = tslib_1.__importDefault(require("figures"));
const getenv_1 = require("getenv");
const log_symbols_1 = tslib_1.__importDefault(require("log-symbols"));
const terminal_link_1 = tslib_1.__importDefault(require("terminal-link"));
// eslint-disable-next-line eslint-import/no-extraneous-dependencies
const nodeDebug = require('debug')('eas:log:debug');
class Log {
    static isDebug = (0, getenv_1.boolish)('EXPO_DEBUG', false);
    static log(...args) {
        Log.consoleLog(...args);
    }
    static newLine() {
        Log.consoleLog();
    }
    static addNewLineIfNone() {
        if (!Log.isLastLineNewLine) {
            Log.newLine();
        }
    }
    /**
     * Signal that the cursor is already at the start of a fresh line (e.g. after
     * a spinner clears itself), so that the next `addNewLineIfNone()` call knows
     * it doesn't need to emit an extra blank line.
     */
    static markFreshLine() {
        Log.isLastLineNewLine = true;
    }
    static error(...args) {
        Log.consoleLog(...Log.withTextColor(args, chalk_1.default.red));
    }
    static warn(...args) {
        Log.consoleLog(...Log.withTextColor(args, chalk_1.default.yellow));
    }
    static debug(...args) {
        if (Log.isDebug) {
            Log.consoleLog(...args);
        }
        else {
            Log.updateIsLastLineNewLine(args);
            nodeDebug(...args);
        }
    }
    static gray(...args) {
        Log.consoleLog(...Log.withTextColor(args, chalk_1.default.gray));
    }
    static warnDeprecatedFlag(flag, message) {
        Log.warn(`› ${chalk_1.default.bold('--' + flag)} flag is deprecated. ${message}`);
    }
    static fail(message) {
        Log.log(`${chalk_1.default.red(log_symbols_1.default.error)} ${message}`);
    }
    static succeed(message) {
        Log.log(`${chalk_1.default.green(log_symbols_1.default.success)} ${message}`);
    }
    static withTick(...args) {
        Log.consoleLog(chalk_1.default.green(figures_1.default.tick), ...args);
    }
    static withInfo(...args) {
        Log.consoleLog(chalk_1.default.green(figures_1.default.info), ...args);
    }
    static consoleLog(...args) {
        Log.updateIsLastLineNewLine(args);
        // eslint-disable-next-line no-console
        console.log(...args);
    }
    static withTextColor(args, chalkColor) {
        return args.map(arg => chalkColor(arg));
    }
    static isLastLineNewLine = false;
    static updateIsLastLineNewLine(args) {
        if (args.length === 0) {
            Log.isLastLineNewLine = true;
        }
        else {
            const lastArg = args[args.length - 1];
            if (typeof lastArg === 'string' && (lastArg === '' || lastArg.match(/[\r\n]$/))) {
                Log.isLastLineNewLine = true;
            }
            else {
                Log.isLastLineNewLine = false;
            }
        }
    }
}
exports.default = Log;
/**
 * Prints a link for given URL, using text if provided, otherwise text is just the URL.
 * Format links as dim (unless disabled) and with an underline.
 *
 * @example https://expo.dev
 */
function link(url, { text = url, fallback, dim = true } = {}) {
    // Links can be disabled via env variables https://github.com/jamestalmage/supports-hyperlinks/blob/master/index.js
    const output = (0, terminal_link_1.default)(text, url, {
        fallback: () => fallback ?? (text === url ? chalk_1.default.underline(url) : `${text}: ${chalk_1.default.underline(url)}`),
    });
    return dim ? chalk_1.default.dim(output) : output;
}
/**
 * Provide a consistent "Learn more" link experience.
 * Format links as dim (unless disabled) with an underline.
 *
 * @example Learn more: https://expo.dev
 */
function learnMore(url, { learnMoreMessage: maybeLearnMoreMessage, dim = true, } = {}) {
    return link(url, { text: maybeLearnMoreMessage ?? 'Learn more', dim });
}
