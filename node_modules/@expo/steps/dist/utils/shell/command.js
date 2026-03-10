"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShellCommandAndArgs = getShellCommandAndArgs;
function getShellCommandAndArgs(shell, script) {
    const splits = shell.split(' ');
    const command = splits[0];
    const args = [...splits.slice(1)];
    if (script) {
        args.push(script);
    }
    return {
        command,
        args,
    };
}
