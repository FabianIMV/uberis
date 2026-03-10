import { Platform } from '@expo/eas-build-job';
import EasCommand from '../commandUtils/EasCommand';
export default class Config extends EasCommand {
    static description: string;
    static flags: {
        json: import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        'non-interactive': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
        platform: import("@oclif/core/lib/interfaces").OptionFlag<Platform | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        profile: import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
        'eas-json-only': import("@oclif/core/lib/interfaces").BooleanFlag<boolean>;
    };
    static contextDefinition: {
        getDynamicLoggedInAsync: import("../commandUtils/context/DynamicLoggedInContextField").default;
        projectDir: import("../commandUtils/context/ProjectDirContextField").default;
        getDynamicPublicProjectConfigAsync: import("../commandUtils/context/DynamicProjectConfigContextField").DynamicPublicProjectConfigContextField;
        getDynamicPrivateProjectConfigAsync: import("../commandUtils/context/DynamicProjectConfigContextField").DynamicPrivateProjectConfigContextField;
    };
    runAsync(): Promise<void>;
}
