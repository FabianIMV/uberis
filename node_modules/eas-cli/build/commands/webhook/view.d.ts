import EasCommand from '../../commandUtils/EasCommand';
export default class WebhookView extends EasCommand {
    static description: string;
    static args: {
        ID: import("@oclif/core/lib/interfaces").Arg<string, Record<string, unknown>>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
    };
    runAsync(): Promise<void>;
}
