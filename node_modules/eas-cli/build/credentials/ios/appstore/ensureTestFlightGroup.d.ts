import { App } from '@expo/apple-utils';
/**
 * Ensure a TestFlight internal group with access to all builds exists for the app and has all admin users invited to it.
 * This allows users to instantly access their builds from TestFlight after it finishes processing.
 */
export declare function ensureTestFlightGroupExistsAsync(app: App): Promise<void>;
