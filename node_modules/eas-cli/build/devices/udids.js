"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUDID = isValidUDID;
exports.normalizeUDID = normalizeUDID;
function isValidUDID(udid) {
    if (udid.length === 25) {
        return /[A-Z0-9]{8}-[A-Z0-9]{16}/.test(udid);
    }
    else if (udid.length === 40) {
        return /[a-f0-9]{40}/.test(udid);
    }
    else {
        return false;
    }
}
function normalizeUDID(rawUDID) {
    const udid = rawUDID.trim();
    if (udid.length === 25) {
        return udid.toUpperCase();
    }
    else if (udid.length === 40) {
        return udid.toLowerCase();
    }
    else {
        return udid;
    }
}
