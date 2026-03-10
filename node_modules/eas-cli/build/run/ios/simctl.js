"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simctlAsync = simctlAsync;
const xcrun_1 = require("./xcrun");
async function simctlAsync(args, options) {
    return await (0, xcrun_1.xcrunAsync)(['simctl', ...args], options);
}
