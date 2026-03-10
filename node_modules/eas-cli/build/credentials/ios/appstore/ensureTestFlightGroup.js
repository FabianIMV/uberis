"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTestFlightGroupExistsAsync = ensureTestFlightGroupExistsAsync;
const tslib_1 = require("tslib");
const apple_utils_1 = require("@expo/apple-utils");
const ensureAppExists_1 = require("./ensureAppExists");
const log_1 = tslib_1.__importDefault(require("../../../log"));
const ora_1 = require("../../../ora");
const prompts_1 = require("../../../prompts");
// The name of the internal TestFlight group, this should probably never change.
const AUTO_GROUP_NAME = 'Team (Expo)';
/**
 * Ensure a TestFlight internal group with access to all builds exists for the app and has all admin users invited to it.
 * This allows users to instantly access their builds from TestFlight after it finishes processing.
 */
async function ensureTestFlightGroupExistsAsync(app) {
    if (process.env.EAS_NO_AUTO_TESTFLIGHT_SETUP) {
        log_1.default.debug('EAS_NO_AUTO_TESTFLIGHT_SETUP is set, skipping TestFlight setup');
        return;
    }
    const groups = await app.getBetaGroupsAsync({
        query: {
            includes: ['betaTesters'],
        },
    });
    if (groups.length > 0) {
        log_1.default.debug(`Found ${groups.length} TestFlight groups`);
        log_1.default.debug('Skipping creating a new TestFlight group');
        return;
    }
    const group = await ensureInternalGroupAsync({
        app,
        groups,
    });
    const users = await apple_utils_1.User.getAsync(app.context);
    const admins = users.filter(user => user.attributes.roles?.includes(apple_utils_1.UserRole.ADMIN));
    await addAllUsersToInternalGroupAsync(group, admins);
}
async function ensureInternalGroupAsync({ groups, app, }) {
    let betaGroup = groups.find(group => group.attributes.name === AUTO_GROUP_NAME);
    if (!betaGroup) {
        const spinner = (0, ora_1.ora)().start('Creating TestFlight group...');
        try {
            // Apple throw an error if you create the group too quickly after creating the app. We'll retry a few times.
            await pollRetryAsync(async () => {
                betaGroup = await app.createBetaGroupAsync({
                    name: AUTO_GROUP_NAME,
                    isInternalGroup: true,
                    // Automatically add latest builds to the group without needing to run the command.
                    hasAccessToAllBuilds: true,
                });
            }, {
                shouldRetry(error) {
                    if ((0, ensureAppExists_1.isAppleError)(error)) {
                        spinner.text = `TestFlight still preparing, retrying in 10 seconds...`;
                        return error.data.errors.some(error => error.code === 'ENTITY_ERROR.RELATIONSHIP.INVALID');
                    }
                    return false;
                },
            });
            spinner.succeed(`TestFlight group created: ${AUTO_GROUP_NAME}`);
        }
        catch (error) {
            spinner.fail('Failed to create TestFlight group...');
            throw error;
        }
    }
    if (!betaGroup) {
        throw new Error('Failed to create internal TestFlight group');
    }
    // `hasAccessToAllBuilds` is a newer feature that allows the group to automatically have access to all builds. This cannot be patched so we need to recreate the group.
    if (!betaGroup.attributes.hasAccessToAllBuilds) {
        if (await (0, prompts_1.confirmAsync)({
            message: 'Regenerate internal TestFlight group to allow automatic access to all builds?',
        })) {
            await apple_utils_1.BetaGroup.deleteAsync(app.context, { id: betaGroup.id });
            return await ensureInternalGroupAsync({
                app,
                groups: await app.getBetaGroupsAsync({
                    query: {
                        includes: ['betaTesters'],
                    },
                }),
            });
        }
    }
    return betaGroup;
}
async function addAllUsersToInternalGroupAsync(group, users) {
    let emails = users
        .filter(user => user.attributes.email)
        .map(user => ({
        email: user.attributes.email,
        firstName: user.attributes.firstName ?? '',
        lastName: user.attributes.lastName ?? '',
    }));
    const { betaTesters } = group.attributes;
    const existingEmails = betaTesters?.map(tester => tester.attributes.email).filter(Boolean) ?? [];
    // Filter out existing beta testers.
    if (betaTesters) {
        emails = emails.filter(user => !existingEmails.find(existingEmail => existingEmail === user.email));
    }
    // No new users to add to the internal group.
    if (!emails.length) {
        // No need to log which users are here on subsequent runs as devs already know the drill at this point.
        log_1.default.debug(`All current admins are already added to the group: ${group.attributes.name}`);
        return;
    }
    log_1.default.debug(`Adding ${emails.length} users to internal group: ${group.attributes.name}`);
    log_1.default.debug(`Users: ${emails.map(user => user.email).join(', ')}`);
    const data = await group.createBulkBetaTesterAssignmentsAsync(emails);
    const success = data.attributes.betaTesters.every(tester => {
        if (tester.assignmentResult === 'FAILED') {
            if (tester.errors && Array.isArray(tester.errors) && tester.errors.length) {
                if (tester.errors.length === 1 &&
                    tester.errors[0].key === 'Halliday.tester.already.exists') {
                    return true;
                }
                for (const error of tester.errors) {
                    log_1.default.error(`Error adding user ${tester.email} to TestFlight group "${group.attributes.name}": ${error.key}`);
                }
            }
            return false;
        }
        if (tester.assignmentResult === 'NOT_QUALIFIED_FOR_INTERNAL_GROUP') {
            return false;
        }
        return true;
    });
    if (!success) {
        const groupUrl = await getTestFlightGroupUrlAsync(group);
        log_1.default.error(`Unable to add all admins to TestFlight group "${group.attributes.name}". You can add them manually in App Store Connect. ${groupUrl ?? ''}`);
    }
    else {
        log_1.default.log(`TestFlight access enabled for: ` +
            data.attributes.betaTesters
                .map(tester => tester.email)
                .filter(Boolean)
                .join(', '));
        // TODO: When we have more TestFlight functionality, we can link to it from here.
    }
}
async function getTestFlightGroupUrlAsync(group) {
    if (group.context.providerId) {
        try {
            const session = await apple_utils_1.Session.getSessionForProviderIdAsync(group.context.providerId);
            return `https://appstoreconnect.apple.com/teams/${session.provider.publicProviderId}/apps/6741088859/testflight/groups/${group.id}`;
        }
        catch (error) {
            // Avoid crashing if we can't get the session.
            log_1.default.debug('Failed to get session for provider ID', error);
        }
    }
    return null;
}
async function pollRetryAsync(fn, { shouldRetry, retries = 15, 
// 25 seconds was the minium interval I calculated when measuring against 5 second intervals.
// Switching to 10 seconds to account for days where Apple APIs are faster.
interval = 10000, } = {}) {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            if (shouldRetry && !shouldRetry(error)) {
                throw error;
            }
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw lastError;
}
