"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubmissionContextAsync = createSubmissionContextAsync;
const eas_build_job_1 = require("@expo/eas-build-job");
const uuid_1 = require("uuid");
const AnalyticsManager_1 = require("../analytics/AnalyticsManager");
const context_1 = require("../credentials/context");
const projectUtils_1 = require("../project/projectUtils");
async function createSubmissionContextAsync(params) {
    const { applicationIdentifier, projectDir, nonInteractive, actor, exp, projectId, graphqlClient, analytics, vcsClient, profile, groups: groupsFromParams, platform, } = params;
    const { env, ...rest } = params;
    const projectName = exp.slug;
    const account = await (0, projectUtils_1.getOwnerAccountForProjectIdAsync)(graphqlClient, projectId);
    const accountId = account.id;
    let credentialsCtx = params.credentialsCtx;
    if (!credentialsCtx) {
        credentialsCtx = new context_1.CredentialsContext({
            projectDir,
            user: actor,
            graphqlClient,
            analytics,
            projectInfo: { exp, projectId },
            nonInteractive,
            vcsClient,
        });
    }
    let groups;
    if (platform === eas_build_job_1.Platform.IOS) {
        groups = (groupsFromParams ??
            profile.groups ??
            []);
    }
    else {
        groups = undefined;
    }
    const analyticsEventProperties = {
        tracking_id: (0, uuid_1.v4)(),
        platform: params.platform,
        ...(accountId && { account_id: accountId }),
        project_id: projectId,
    };
    rest.analytics.logEvent(AnalyticsManager_1.SubmissionEvent.SUBMIT_COMMAND, analyticsEventProperties);
    return {
        ...rest,
        accountName: account.name,
        credentialsCtx,
        groups,
        projectName,
        user: actor,
        analyticsEventProperties,
        applicationIdentifierOverride: applicationIdentifier,
    };
}
