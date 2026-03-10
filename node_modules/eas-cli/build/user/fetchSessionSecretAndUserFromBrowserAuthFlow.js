"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSessionSecretAndUserFromBrowserAuthFlowAsync = fetchSessionSecretAndUserFromBrowserAuthFlowAsync;
const expoBrowserAuthFlowLauncher_1 = require("./expoBrowserAuthFlowLauncher");
const fetchUser_1 = require("./fetchUser");
async function fetchSessionSecretAndUserFromBrowserAuthFlowAsync({ sso = false }) {
    const sessionSecret = await (0, expoBrowserAuthFlowLauncher_1.getSessionUsingBrowserAuthFlowAsync)({ sso });
    const userData = await (0, fetchUser_1.fetchUserAsync)({ sessionSecret });
    return {
        sessionSecret,
        id: userData.id,
        username: userData.username,
    };
}
