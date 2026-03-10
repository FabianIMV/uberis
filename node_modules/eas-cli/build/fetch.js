"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpsProxyAgent = exports.RequestError = exports.Response = exports.Headers = void 0;
exports.default = default_1;
const tslib_1 = require("tslib");
const https_proxy_agent_1 = tslib_1.__importDefault(require("https-proxy-agent"));
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
var node_fetch_2 = require("node-fetch");
Object.defineProperty(exports, "Headers", { enumerable: true, get: function () { return node_fetch_2.Headers; } });
Object.defineProperty(exports, "Response", { enumerable: true, get: function () { return node_fetch_2.Response; } });
class RequestError extends Error {
    response;
    constructor(message, response) {
        super(message);
        this.response = response;
    }
}
exports.RequestError = RequestError;
function createHttpsAgent() {
    const httpsProxyUrl = process.env.https_proxy;
    if (!httpsProxyUrl) {
        return null;
    }
    return (0, https_proxy_agent_1.default)(httpsProxyUrl);
}
exports.httpsProxyAgent = createHttpsAgent();
async function default_1(url, init) {
    const response = await (0, node_fetch_1.default)(url, {
        ...init,
        ...(exports.httpsProxyAgent ? { agent: exports.httpsProxyAgent } : {}),
    });
    if (response.status >= 400) {
        throw new RequestError(`Request failed: ${response.status} (${response.statusText})`, response);
    }
    return response;
}
