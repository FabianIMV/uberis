"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = capitalizeFirstLetter;
function capitalizeFirstLetter(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
