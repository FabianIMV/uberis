"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeWarnAboutUsageOveragesAsync = maybeWarnAboutUsageOveragesAsync;
exports.calculatePercentUsed = calculatePercentUsed;
exports.createProgressBar = createProgressBar;
exports.displayOverageWarning = displayOverageWarning;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const AccountQuery_1 = require("../../graphql/queries/AccountQuery");
const log_1 = tslib_1.__importStar(require("../../log"));
const THRESHOLD_PERCENT = 85;
async function maybeWarnAboutUsageOveragesAsync({ graphqlClient, accountId, }) {
    try {
        const currentDate = new Date();
        const { name, subscription, usageMetrics: { EAS_BUILD }, } = await AccountQuery_1.AccountQuery.getUsageForOverageWarningAsync(graphqlClient, accountId, currentDate);
        const planMetric = EAS_BUILD?.planMetrics?.[0];
        if (!planMetric || !subscription) {
            return;
        }
        const percentUsed = calculatePercentUsed(planMetric.value, planMetric.limit);
        if (percentUsed >= THRESHOLD_PERCENT) {
            const hasFreePlan = subscription.name === 'Free';
            displayOverageWarning({ percentUsed, hasFreePlan, name });
        }
    }
    catch (error) {
        // Silently fail if we can't fetch usage data - we don't want to block the user's workflow
        log_1.default.debug(`Failed to fetch usage data: ${error}`);
    }
}
function calculatePercentUsed(value, limit) {
    if (limit === 0) {
        return 0;
    }
    return Math.min(Math.floor((value / limit) * 100), 100);
}
function createProgressBar(percentUsed, width = 30) {
    const filledWidth = Math.round((percentUsed / 100) * width);
    const emptyWidth = width - filledWidth;
    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);
    return `${filled}${empty}`;
}
function displayOverageWarning({ percentUsed, hasFreePlan, name, }) {
    const message = chalk_1.default.bold(`You've used ${percentUsed}% of your included build credits for this month.`);
    // Don't show progress bar at 100% - it's redundant when the limit is reached
    const progressBar = percentUsed < 100 ? ' ' + createProgressBar(percentUsed) : '';
    log_1.default.warn(message + progressBar);
    const billingUrl = `https://expo.dev/accounts/${name}/settings/billing`;
    const warning = hasFreePlan
        ? "You won't be able to start new builds once you reach the limit. " +
            (0, log_1.link)(billingUrl, { text: 'Upgrade your plan to continue service.', dim: false })
        : 'Additional usage beyond your limit will be charged at pay-as-you-go rates. ' +
            (0, log_1.link)(billingUrl, {
                text: 'See usage in billing.',
                dim: false,
            });
    log_1.default.warn(warning);
}
