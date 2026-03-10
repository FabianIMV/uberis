"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountQuery = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
const client_1 = require("../client");
const Account_1 = require("../types/Account");
exports.AccountQuery = {
    async getByNameAsync(graphqlClient, accountName) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AccountByName($accountName: String!) {
              account {
                byName(accountName: $accountName) {
                  id
                  name
                }
              }
            }
          `, { accountName }, { additionalTypenames: ['Account'] })
            .toPromise());
        return data.account.byName;
    },
    async getFullUsageAsync(graphqlClient, accountId, currentDate, startDate, endDate) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AccountFullUsage(
              $accountId: String!
              $currentDate: DateTime!
              $startDate: DateTime!
              $endDate: DateTime!
            ) {
              account {
                byId(accountId: $accountId) {
                  id
                  name
                  subscription {
                    id
                    ...SubscriptionDetailsFragment
                  }
                  billingPeriod(date: $currentDate) {
                    id
                    ...BillingPeriodFragment
                  }
                  usageMetrics {
                    MEDIUM_ANDROID_BUILDS: metricsForServiceMetric(
                      serviceMetric: BUILDS
                      granularity: TOTAL
                      timespan: { start: $startDate, end: $endDate }
                      filterParams: {
                        platform: "android"
                        billingResourceClass: ["medium"]
                        status: ["finished", "errored"]
                      }
                    ) {
                      id
                      ...AccountUsageMetricFragment
                    }
                    LARGE_ANDROID_BUILDS: metricsForServiceMetric(
                      serviceMetric: BUILDS
                      granularity: TOTAL
                      timespan: { start: $startDate, end: $endDate }
                      filterParams: {
                        platform: "android"
                        billingResourceClass: ["large"]
                        status: ["finished", "errored"]
                      }
                    ) {
                      id
                      ...AccountUsageMetricFragment
                    }
                    MEDIUM_IOS_BUILDS: metricsForServiceMetric(
                      serviceMetric: BUILDS
                      granularity: TOTAL
                      timespan: { start: $startDate, end: $endDate }
                      filterParams: {
                        platform: "ios"
                        billingResourceClass: ["medium"]
                        status: ["finished", "errored"]
                      }
                    ) {
                      id
                      ...AccountUsageMetricFragment
                    }
                    LARGE_IOS_BUILDS: metricsForServiceMetric(
                      serviceMetric: BUILDS
                      granularity: TOTAL
                      timespan: { start: $startDate, end: $endDate }
                      filterParams: {
                        platform: "ios"
                        billingResourceClass: ["large"]
                        status: ["finished", "errored"]
                      }
                    ) {
                      id
                      ...AccountUsageMetricFragment
                    }
                    EAS_BUILD: byBillingPeriod(date: $currentDate, service: BUILDS) {
                      id
                      ...UsageMetricTotalFragment
                    }
                    EAS_UPDATE: byBillingPeriod(date: $currentDate, service: UPDATES) {
                      id
                      ...UsageMetricTotalFragment
                    }
                  }
                }
              }
            }
            ${(0, graphql_1.print)(Account_1.SubscriptionDetailsFragmentNode)}
            ${(0, graphql_1.print)(Account_1.BillingPeriodFragmentNode)}
            ${(0, graphql_1.print)(Account_1.AccountUsageMetricFragmentNode)}
            ${(0, graphql_1.print)(Account_1.UsageMetricTotalFragmentNode)}
          `, {
            accountId,
            currentDate: currentDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        }, {
            additionalTypenames: [
                'Account',
                'AccountUsageMetrics',
                'UsageMetricTotal',
                'BillingPeriod',
                'EstimatedUsage',
                'EstimatedOverageAndCost',
            ],
        })
            .toPromise());
        if (!data.account.byId) {
            throw new Error(`Account with ID ${accountId} not found`);
        }
        return data.account.byId;
    },
    async getUsageForOverageWarningAsync(graphqlClient, accountId, currentDate) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AccountUsageForOverageWarning($accountId: String!, $currentDate: DateTime!) {
              account {
                byId(accountId: $accountId) {
                  id
                  name
                  subscription {
                    id
                    name
                  }
                  usageMetrics {
                    EAS_BUILD: byBillingPeriod(date: $currentDate, service: BUILDS) {
                      id
                      planMetrics {
                        id
                        serviceMetric
                        value
                        limit
                      }
                    }
                  }
                }
              }
            }
          `, { accountId, currentDate: currentDate.toISOString() }, {
            additionalTypenames: ['Account', 'AccountUsageMetrics', 'UsageMetricTotal'],
        })
            .toPromise());
        return data.account.byId;
    },
    async getBillingPeriodAsync(graphqlClient, accountId, currentDate) {
        const data = await (0, client_1.withErrorHandlingAsync)(graphqlClient
            .query((0, graphql_tag_1.default) `
            query AccountBillingPeriod($accountId: String!, $currentDate: DateTime!) {
              account {
                byId(accountId: $accountId) {
                  id
                  name
                  billingPeriod(date: $currentDate) {
                    id
                    ...BillingPeriodFragment
                  }
                }
              }
            }
            ${(0, graphql_1.print)(Account_1.BillingPeriodFragmentNode)}
          `, { accountId, currentDate: currentDate.toISOString() }, {
            additionalTypenames: ['Account', 'BillingPeriod'],
        })
            .toPromise());
        const { start, end } = data.account.byId?.billingPeriod ?? {};
        if (!start || !end) {
            throw new Error('Billing period data not found');
        }
        return {
            start: new Date(start),
            end: new Date(end),
        };
    },
};
