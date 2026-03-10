"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const AppleDeviceQuery_1 = require("../../credentials/ios/api/graphql/queries/AppleDeviceQuery");
const formatDevice_1 = tslib_1.__importDefault(require("../../devices/utils/formatDevice"));
const log_1 = tslib_1.__importDefault(require("../../log"));
const ora_1 = require("../../ora");
const projectUtils_1 = require("../../project/projectUtils");
class DeviceView extends EasCommand_1.default {
    static description = 'view a device for your project';
    static args = {
        UDID: core_1.Args.string({}),
    };
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { UDID } = (await this.parse(DeviceView)).args;
        if (!UDID) {
            log_1.default.log(`The device UDID is required to view a specific device. For example:

   eas device:view 00005787-000872430189501D

If you are not sure what is the UDID of the device you are looking for, run:

   eas device:list
`);
            throw new Error('Device UDID is missing');
        }
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(DeviceView, {
            nonInteractive: true,
        });
        const account = await (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(graphqlClient, projectId);
        const spinner = (0, ora_1.ora)().start(`Fetching device details for ${UDID}…`);
        try {
            const device = await AppleDeviceQuery_1.AppleDeviceQuery.getByDeviceIdentifierAsync(graphqlClient, account.name, UDID);
            if (device) {
                spinner.succeed('Fetched device details');
                log_1.default.log(`\n${(0, formatDevice_1.default)(device, device.appleTeam)}`);
            }
            else {
                spinner.fail(`Couldn't find a device with the UDID ${UDID}`);
            }
        }
        catch (e) {
            spinner.fail(`Something went wrong and we couldn't fetch the device with UDID ${UDID}`);
            throw e;
        }
    }
}
exports.default = DeviceView;
