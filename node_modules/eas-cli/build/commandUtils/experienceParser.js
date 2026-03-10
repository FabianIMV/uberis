"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORBIDDEN_NAMES = exports.isValidSlugStrict = exports.fullNameToSlug = exports.experienceToAccountName = exports.isValidExperienceName = void 0;
exports.isSlugForbidden = isSlugForbidden;
const tslib_1 = require("tslib");
/**
 * TODO: Move to eas-build repo
 */
const invariant_1 = tslib_1.__importDefault(require("invariant"));
const EXPERIENCE_NAME_REGEX = /^@(.*?)\/(.*)/; // @<captureGroup1>/<captureGroup2>
const SLUG_REGEX_STRICT = /^[a-zA-Z0-9_\\-]+$/; // from xdl-schemas slug
const isValidExperienceName = (experienceName) => {
    const matches = experienceName.match(EXPERIENCE_NAME_REGEX);
    return matches !== null && matches[1].length > 0 && matches[2].length > 0;
};
exports.isValidExperienceName = isValidExperienceName;
const experienceToAccountName = (experienceName) => {
    const matches = experienceName.match(EXPERIENCE_NAME_REGEX);
    const accountName = matches ? matches[1] : null;
    (0, invariant_1.default)(accountName, `The experience name "${experienceName}" is malformed`);
    return accountName;
};
exports.experienceToAccountName = experienceToAccountName;
const fullNameToSlug = (fullName) => {
    const match = fullName.match(EXPERIENCE_NAME_REGEX);
    return match ? match[2] : null;
};
exports.fullNameToSlug = fullNameToSlug;
const isValidSlugStrict = (slug) => SLUG_REGEX_STRICT.test(slug);
exports.isValidSlugStrict = isValidSlugStrict;
// keep this list in sync with our project creation CLI https://github.com/expo/expo/blob/main/packages/create-expo/src/Template.ts
exports.FORBIDDEN_NAMES = [
    'react-native',
    'react',
    'react-dom',
    'react-native-web',
    'expo',
    'expo-router',
];
function isSlugForbidden(slug) {
    return exports.FORBIDDEN_NAMES.includes(slug);
}
