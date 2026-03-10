import EasCommand from '../../commandUtils/EasCommand';
import { ExpoGraphqlClient } from '../../commandUtils/context/contextUtils/createGraphqlClient';
import { PaginatedQueryOptions } from '../../commandUtils/pagination';
import { AppleDeviceQueryResult } from '../../credentials/ios/api/graphql/queries/AppleDeviceQuery';
import { AppleDevice, Maybe } from '../../graphql/generated';
export default class DeviceRename extends EasCommand {
    static description: string;
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'apple-team-id': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        udid: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        name: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    static contextDefinition: {
        loggedIn: import("../../commandUtils/context/LoggedInContextField").default;
        projectId: import("../../commandUtils/context/ProjectIdContextField").ProjectIdContextField;
    };
    runAsync(): Promise<void>;
    promptForNewDeviceNameAsync(initial: Maybe<string> | undefined): Promise<string | undefined>;
    renameDeviceOnExpoAsync(graphqlClient: ExpoGraphqlClient, chosenDevice: AppleDevice | AppleDeviceQueryResult, newDeviceName: string): Promise<void>;
    renameDeviceOnAppleAsync(device: AppleDevice | AppleDeviceQueryResult, appleTeamIdentifier: string, newDeviceName: string): Promise<void>;
    logChosenDevice(device: AppleDevice | AppleDeviceQueryResult, appleTeamName: Maybe<string> | undefined, appleTeamIdentifier: string, { json }: PaginatedQueryOptions): void;
}
