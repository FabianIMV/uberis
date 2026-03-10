"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiV2Error = void 0;
class ApiV2Error extends Error {
    name = 'ApiV2Error';
    expoApiV2ErrorCode;
    expoApiV2ErrorDetails;
    expoApiV2ErrorServerStack;
    expoApiV2ErrorMetadata;
    expoApiV2ErrorRequestId;
    constructor(response) {
        super(response.message);
        this.expoApiV2ErrorCode = response.code;
        this.expoApiV2ErrorDetails = response.details;
        this.expoApiV2ErrorServerStack = response.stack;
        this.expoApiV2ErrorMetadata = response.metadata;
        this.expoApiV2ErrorRequestId = response.requestId;
    }
}
exports.ApiV2Error = ApiV2Error;
