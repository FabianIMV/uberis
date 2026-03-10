"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountUsageMetricFragmentNode = exports.UsageMetricTotalFragmentNode = exports.EstimatedOverageAndCostFragmentNode = exports.EstimatedUsageFragmentNode = exports.EstimatedUsagePlatformBreakdownFragmentNode = exports.BillingPeriodFragmentNode = exports.SubscriptionDetailsFragmentNode = exports.AddonDetailsFragmentNode = exports.ConcurrenciesFragmentNode = exports.InvoiceFragmentNode = exports.InvoiceLineItemFragmentNode = exports.AccountFragmentNode = void 0;
const tslib_1 = require("tslib");
/* eslint-disable graphql/required-fields */
const graphql_1 = require("graphql");
const graphql_tag_1 = tslib_1.__importDefault(require("graphql-tag"));
exports.AccountFragmentNode = (0, graphql_tag_1.default) `
  fragment AccountFragment on Account {
    id
    name
    ownerUserActor {
      id
      username
    }
    users {
      actor {
        id
      }
      role
    }
  }
`;
exports.InvoiceLineItemFragmentNode = (0, graphql_tag_1.default) `
  fragment InvoiceLineItemFragment on InvoiceLineItem {
    id
    description
    amount
    period {
      start
      end
    }
  }
`;
exports.InvoiceFragmentNode = (0, graphql_tag_1.default) `
  ${(0, graphql_1.print)(exports.InvoiceLineItemFragmentNode)}

  fragment InvoiceFragment on Invoice {
    id
    total
    lineItems {
      ...InvoiceLineItemFragment
    }
  }
`;
exports.ConcurrenciesFragmentNode = (0, graphql_tag_1.default) `
  fragment ConcurrenciesFragment on Concurrencies {
    total
    android
    ios
  }
`;
exports.AddonDetailsFragmentNode = (0, graphql_tag_1.default) `
  fragment AddonDetailsFragment on AddonDetails {
    id
    name
    quantity
  }
`;
exports.SubscriptionDetailsFragmentNode = (0, graphql_tag_1.default) `
  ${(0, graphql_1.print)(exports.ConcurrenciesFragmentNode)}
  ${(0, graphql_1.print)(exports.AddonDetailsFragmentNode)}
  ${(0, graphql_1.print)(exports.InvoiceFragmentNode)}

  fragment SubscriptionDetailsFragment on SubscriptionDetails {
    id
    name
    status
    nextInvoice
    nextInvoiceAmountDueCents
    recurringCents
    price
    concurrencies {
      ...ConcurrenciesFragment
    }
    addons {
      ...AddonDetailsFragment
    }
    upcomingInvoice {
      ...InvoiceFragment
    }
  }
`;
exports.BillingPeriodFragmentNode = (0, graphql_tag_1.default) `
  fragment BillingPeriodFragment on BillingPeriod {
    id
    start
    end
    anchor
  }
`;
exports.EstimatedUsagePlatformBreakdownFragmentNode = (0, graphql_tag_1.default) `
  fragment EstimatedUsagePlatformBreakdownFragment on EstimatedUsagePlatformBreakdown {
    ios {
      value
      limit
    }
    android {
      value
      limit
    }
  }
`;
exports.EstimatedUsageFragmentNode = (0, graphql_tag_1.default) `
  ${(0, graphql_1.print)(exports.EstimatedUsagePlatformBreakdownFragmentNode)}

  fragment EstimatedUsageFragment on EstimatedUsage {
    id
    service
    serviceMetric
    metricType
    value
    limit
    platformBreakdown {
      ...EstimatedUsagePlatformBreakdownFragment
    }
  }
`;
exports.EstimatedOverageAndCostFragmentNode = (0, graphql_tag_1.default) `
  fragment EstimatedOverageAndCostFragment on EstimatedOverageAndCost {
    id
    service
    serviceMetric
    metricType
    value
    limit
    totalCost
    metadata {
      ... on AccountUsageEASBuildMetadata {
        billingResourceClass
        platform
      }
    }
  }
`;
exports.UsageMetricTotalFragmentNode = (0, graphql_tag_1.default) `
  ${(0, graphql_1.print)(exports.BillingPeriodFragmentNode)}
  ${(0, graphql_1.print)(exports.EstimatedUsageFragmentNode)}
  ${(0, graphql_1.print)(exports.EstimatedOverageAndCostFragmentNode)}

  fragment UsageMetricTotalFragment on UsageMetricTotal {
    id
    billingPeriod {
      ...BillingPeriodFragment
    }
    planMetrics {
      ...EstimatedUsageFragment
    }
    overageMetrics {
      ...EstimatedOverageAndCostFragment
    }
    totalCost
  }
`;
exports.AccountUsageMetricFragmentNode = (0, graphql_tag_1.default) `
  fragment AccountUsageMetricFragment on AccountUsageMetric {
    id
    serviceMetric
    metricType
    value
  }
`;
