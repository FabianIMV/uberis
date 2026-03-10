/**
 * Perform the same validation as the server, to avoid GraphQL errors.
 */
export declare function validateFullNameAndSlug(fullName: string, slug: string): void;
/**
 * Attempt to derive a valid slug name from the one passed in
 */
export declare function validSlugName(slug: string): string;
