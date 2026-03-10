import EasCommand from '../commandUtils/EasCommand';
export default class AnalyticsView extends EasCommand {
    static description: string;
    static args: {
        STATUS: import("@oclif/core/lib/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    runAsync(): Promise<void>;
}
