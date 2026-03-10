import { z } from 'zod';
/** Submission config as used by the submission worker. */
export declare namespace SubmissionConfig {
    type Ios = z.infer<typeof Ios.SchemaZ>;
    type Android = z.infer<typeof Android.SchemaZ>;
    namespace Ios {
        const SchemaZ: z.ZodIntersection<z.ZodObject<{
            ascAppIdentifier: z.ZodString;
            isVerboseFastlaneEnabled: z.ZodOptional<z.ZodBoolean>;
            groups: z.ZodOptional<z.ZodArray<z.ZodString>>;
            changelog: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodUnion<readonly [z.ZodObject<{
            appleIdUsername: z.ZodString;
            appleAppSpecificPassword: z.ZodString;
            ascApiJsonKey: z.ZodOptional<z.ZodNever>;
        }, z.core.$strip>, z.ZodObject<{
            ascApiJsonKey: z.ZodString;
            appleIdUsername: z.ZodOptional<z.ZodNever>;
            appleAppSpecificPassword: z.ZodOptional<z.ZodNever>;
        }, z.core.$strip>]>>;
    }
    namespace Android {
        enum ReleaseStatus {
            COMPLETED = "completed",
            DRAFT = "draft",
            HALTED = "halted",
            IN_PROGRESS = "inProgress"
        }
        const SchemaZ: z.ZodIntersection<z.ZodObject<{
            track: z.ZodString;
            changesNotSentForReview: z.ZodDefault<z.ZodBoolean>;
            googleServiceAccountKeyJson: z.ZodString;
            isVerboseFastlaneEnabled: z.ZodOptional<z.ZodBoolean>;
            changelog: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodUnion<readonly [z.ZodObject<{
            releaseStatus: z.ZodLiteral<ReleaseStatus.IN_PROGRESS>;
            rollout: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            releaseStatus: z.ZodOptional<z.ZodEnum<typeof ReleaseStatus>>;
            rollout: z.ZodOptional<z.ZodNever>;
        }, z.core.$strip>]>>;
    }
}
