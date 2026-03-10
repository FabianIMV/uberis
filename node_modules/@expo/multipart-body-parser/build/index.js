"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMultipartPartWithName = exports.parseMultipartMixedResponseAsync = void 0;
const Multipart = __importStar(require("multipasta"));
/**
 * Parse a multipart response into an array of {@link MultipartPart}. All part bodies are decoded as UTF-8 strings.
 * @param contentTypeHeader - value of the content-type header from the response
 * @param bodyBuffer - buffer of the body from the response
 * @returns - array of {@link MultipartPart}
 */
async function parseMultipartMixedResponseAsync(contentTypeHeader, bodyBuffer) {
    return await new Promise((resolve, reject) => {
        const parts = [];
        const parser = Multipart.make({
            headers: {
                'content-type': contentTypeHeader,
            },
            onField: (info, value) => {
                parts.push({
                    body: Multipart.decodeField(info, value),
                    headers: new Map(Object.entries(info.headers)),
                    name: info.name,
                    contentDisposition: info.contentDisposition,
                    contentDispositionParameters: info.contentDispositionParameters,
                });
            },
            onFile: (_info) => (_chunk) => {
                throw new Error('file not supported');
            },
            onError: (error) => {
                reject(error);
            },
            onDone: () => {
                resolve(parts);
            },
        });
        parser.write(bodyBuffer);
        parser.end();
    });
}
exports.parseMultipartMixedResponseAsync = parseMultipartMixedResponseAsync;
function isMultipartPartWithName(multipartPart, name) {
    return multipartPart.name === name;
}
exports.isMultipartPartWithName = isMultipartPartWithName;
//# sourceMappingURL=index.js.map