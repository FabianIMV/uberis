import EasCommand from '../../commandUtils/EasCommand';
export default class UpdateRollback extends EasCommand {
    static description: string;
    static flags: {
        'private-key-path': import("@oclif/core/lib/interfaces").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces").CustomOptions>;
    };
    runAsync(): Promise<void>;
}
