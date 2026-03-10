import { App, Session } from '@expo/apple-utils';
import { Analytics, MetadataEvent } from '../../analytics/AnalyticsManager';
export type TelemetryContext = {
    app: App;
    auth: Partial<Session.AuthState>;
};
/**
 * Subscribe the telemetry to the ongoing metadata requests and responses.
 * When providing the app and auth info, we can scrub that data from the telemetry.
 * Returns an execution ID to group all events of a single run together, and a unsubscribe function.
 */
export declare function subscribeTelemetryAsync(analytics: Analytics, event: MetadataEvent, options: TelemetryContext): Promise<{
    /** Unsubscribe the telemetry from all apple-utils events */
    unsubscribeTelemetry: () => void;
    /** The unique id added to all telemetry events from a single execution */
    executionId: string;
}>;
/** Exposed for testing */
export declare function makeDataScrubberAsync({ app, auth, }: TelemetryContext): Promise<(<T>(data: T) => string)>;
