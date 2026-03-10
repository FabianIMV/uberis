import EasCommand from '../../commandUtils/EasCommand';
export default class EnvironmentSecretList extends EasCommand {
    static description: string;
    static hidden: boolean;
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    runAsync(): Promise<void>;
}
