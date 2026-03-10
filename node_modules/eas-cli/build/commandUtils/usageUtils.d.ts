import { AppPlatform, EasBuildBillingResourceClass } from '../graphql/generated';
import { AccountFullUsageData } from '../graphql/queries/AccountQuery';
export interface UsageMetricDisplay {
    name: string;
    planValue: number;
    limit: number;
    percentUsed: number;
    overageValue: number;
    overageCost: number;
    unit?: string;
}
export interface BuildOverageByWorkerSize {
    platform: AppPlatform;
    resourceClass: EasBuildBillingResourceClass;
    count: number;
    costCents: number;
}
export interface BuildCountByPlatformAndSize {
    platform: 'ios' | 'android';
    resourceClass: 'medium' | 'large';
    count: number;
}
export interface UsageDisplayData {
    accountName: string;
    subscriptionPlan: string;
    billingPeriod: {
        start: string;
        end: string;
    };
    builds: {
        total: UsageMetricDisplay;
        ios?: UsageMetricDisplay;
        android?: UsageMetricDisplay;
        countsByPlatformAndSize: BuildCountByPlatformAndSize[];
        overagesByWorkerSize: BuildOverageByWorkerSize[];
        overageCostCents: number;
    };
    updates: {
        mau: UsageMetricDisplay;
        bandwidth: UsageMetricDisplay;
        overageCostCents: number;
    };
    totalOverageCostCents: number;
    estimatedBillCents: number;
    recurringCents: number | null;
}
export declare function formatDate(dateString: string): string;
export declare function formatCurrency(cents: number): string;
export declare function formatNumber(value: number, decimals?: number): string;
export declare function calculateDaysRemaining(endDate: string): number;
export declare function calculateDaysElapsed(startDate: string): number;
export declare function calculateBillingPeriodDays(startDate: string, endDate: string): number;
export declare function extractUsageData(data: AccountFullUsageData): UsageDisplayData;
export declare function calculateBillingPeriodInfo(data: UsageDisplayData): {
    daysRemaining: number;
    daysElapsed: number;
    totalDays: number;
};
