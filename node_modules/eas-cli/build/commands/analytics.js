"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const AnalyticsManager_1 = require("../analytics/AnalyticsManager");
const EasCommand_1 = tslib_1.__importDefault(require("../commandUtils/EasCommand"));
const log_1 = tslib_1.__importDefault(require("../log"));
class AnalyticsView extends EasCommand_1.default {
    static description = 'display or change analytics settings';
    static args = {
        STATUS: core_1.Args.string({
            options: ['on', 'off'],
        }),
    };
    async runAsync() {
        const { STATUS: status } = (await this.parse(AnalyticsView)).args;
        if (status) {
            await (0, AnalyticsManager_1.setAnalyticsEnabledAsync)(status === 'on');
            log_1.default.withTick(`${status === 'on' ? 'Enabling' : 'Disabling'} analytics.`);
        }
        else {
            const analyticsEnabled = await (0, AnalyticsManager_1.getAnalyticsEnabledAsync)();
            log_1.default.log(`Analytics are ${analyticsEnabled === false ? 'disabled' : 'enabled'} on this eas-cli installation.`);
        }
    }
}
exports.default = AnalyticsView;
