"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFullNameAndSlug = validateFullNameAndSlug;
exports.validSlugName = validSlugName;
const experienceParser_1 = require("./experienceParser");
/**
 * Perform the same validation as the server, to avoid GraphQL errors.
 */
function validateFullNameAndSlug(fullName, slug) {
    if (!(0, experienceParser_1.isValidExperienceName)(fullName)) {
        throw new Error(`Invalid project name: ${fullName}`);
    }
    if (!(0, experienceParser_1.isValidSlugStrict)(slug)) {
        throw new Error(`Invalid slug: ${slug}`);
    }
    if ((0, experienceParser_1.isSlugForbidden)(slug)) {
        throw new Error(`Cannot create an app named "${slug}" because it would conflict with a dependency of the same name.`);
    }
    if (fullName.length > 255) {
        throw new Error(`Project full name (${fullName}) can not be longer than 255 characters.`);
    }
}
/**
 * Attempt to derive a valid slug name from the one passed in
 */
function validSlugName(slug) {
    const chars = slug.split('');
    const validChars = chars.filter(char => (0, experienceParser_1.isValidSlugStrict)(char));
    return validChars.join('');
}
