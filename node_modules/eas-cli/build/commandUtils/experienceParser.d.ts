export declare const isValidExperienceName: (experienceName: string) => boolean;
export declare const experienceToAccountName: (experienceName: string) => string;
export declare const fullNameToSlug: (fullName: string) => string | null;
export declare const isValidSlugStrict: (slug: string) => boolean;
export declare const FORBIDDEN_NAMES: string[];
export declare function isSlugForbidden(slug: string): boolean;
