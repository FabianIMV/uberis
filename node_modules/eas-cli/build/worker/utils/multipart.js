"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multipartContentType = void 0;
exports.createReadStreamAsync = createReadStreamAsync;
exports.createMultipartBodyFromFilesAsync = createMultipartBodyFromFilesAsync;
const tslib_1 = require("tslib");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const CRLF = '\r\n';
const BOUNDARY_HYPHEN_CHARS = '--';
const BOUNDARY_ID = '----formdata-eas-cli';
const FORM_FOOTER = `${BOUNDARY_HYPHEN_CHARS}${BOUNDARY_ID}${BOUNDARY_HYPHEN_CHARS}${CRLF}${CRLF}`;
const encodeName = (input) => {
    return input.replace(/["\n\\]/g, (c) => {
        switch (c) {
            case '\\':
                return '\\\\';
            case '"':
                return '%22';
            case '\n':
                return '%0A';
            default:
                return `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
        }
    });
};
async function* createReadStreamAsync(fileEntry) {
    let handle;
    try {
        handle = await node_fs_1.default.promises.open(fileEntry.path);
        const hash = (0, node_crypto_1.createHash)('sha512');
        // NOTE(@kitten): fs.createReadStream() was previously used here as an async iterator
        // However, if an early 'end' event is emitted, the async iterator may abort too early and cut off file contents
        let bytesTotal = 0;
        while (bytesTotal < fileEntry.size) {
            const read = await handle.read();
            const output = read.buffer.subarray(0, read.bytesRead);
            bytesTotal += output.byteLength;
            if (bytesTotal > fileEntry.size) {
                throw new RangeError(`Asset "${fileEntry.path}" was modified during the upload (length mismatch)`);
            }
            if (output.byteLength) {
                hash.update(output);
            }
            if (bytesTotal === fileEntry.size) {
                const sha512 = hash.digest('hex');
                if (sha512 !== fileEntry.sha512) {
                    throw new Error(`Asset "${fileEntry.path}" was modified during the upload (checksum mismatch)`);
                }
            }
            if (output.byteLength) {
                yield output;
            }
            else {
                break;
            }
        }
        if (bytesTotal < fileEntry.size) {
            throw new RangeError(`Asset "${fileEntry.path}" was modified during the upload (length mismatch)`);
        }
    }
    finally {
        await handle?.close();
    }
}
const makeFormHeader = (params) => {
    const name = encodeName(params.name);
    let header = BOUNDARY_HYPHEN_CHARS + BOUNDARY_ID + CRLF;
    header += `Content-Disposition: form-data; name="${name}"; filename="${name}"`;
    if (params.contentType) {
        header += `${CRLF}Content-Type: ${params.contentType}`;
    }
    if (params.contentLength) {
        header += `${CRLF}Content-Length: ${params.contentLength}`;
    }
    header += CRLF;
    header += CRLF;
    return header;
};
exports.multipartContentType = `multipart/form-data; boundary=${BOUNDARY_ID}`;
async function* createMultipartBodyFromFilesAsync(entries, onProgressUpdate) {
    const encoder = new TextEncoder();
    for (let idx = 0; idx < entries.length; idx++) {
        const entry = entries[idx];
        const header = makeFormHeader({
            name: entry.sha512,
            contentType: entry.type,
            contentLength: entry.size,
        });
        yield encoder.encode(header);
        yield* createReadStreamAsync(entry);
        yield encoder.encode(CRLF);
        if (onProgressUpdate) {
            onProgressUpdate((idx + 1) / entries.length);
        }
    }
    yield encoder.encode(FORM_FOOTER);
}
