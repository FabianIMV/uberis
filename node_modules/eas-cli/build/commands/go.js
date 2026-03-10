"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const apple_utils_1 = require("@expo/apple-utils");
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs = tslib_1.__importStar(require("fs-extra"));
const os = tslib_1.__importStar(require("os"));
const path = tslib_1.__importStar(require("path"));
const EasCommand_1 = tslib_1.__importDefault(require("../commandUtils/EasCommand"));
const getProjectIdAsync_1 = require("../commandUtils/context/contextUtils/getProjectIdAsync");
const context_1 = require("../credentials/context");
const AscApiKeyUtils_1 = require("../credentials/ios/actions/AscApiKeyUtils");
const BuildCredentialsUtils_1 = require("../credentials/ios/actions/BuildCredentialsUtils");
const SetUpAscApiKey_1 = require("../credentials/ios/actions/SetUpAscApiKey");
const SetUpBuildCredentials_1 = require("../credentials/ios/actions/SetUpBuildCredentials");
const SetUpPushKey_1 = require("../credentials/ios/actions/SetUpPushKey");
const ensureAppExists_1 = require("../credentials/ios/appstore/ensureAppExists");
const generated_1 = require("../graphql/generated");
const AppMutation_1 = require("../graphql/mutations/AppMutation");
const WorkflowRunMutation_1 = require("../graphql/mutations/WorkflowRunMutation");
const AppQuery_1 = require("../graphql/queries/AppQuery");
const WorkflowRunQuery_1 = require("../graphql/queries/WorkflowRunQuery");
const log_1 = tslib_1.__importStar(require("../log"));
const prompts_1 = require("../prompts");
const ora_1 = require("../ora");
const expoConfig_1 = require("../project/expoConfig");
const fetchOrCreateProjectIDForWriteToConfigWithConfirmationAsync_1 = require("../project/fetchOrCreateProjectIDForWriteToConfigWithConfirmationAsync");
const uploadAccountScopedFileAsync_1 = require("../project/uploadAccountScopedFileAsync");
const uploadAccountScopedProjectSourceAsync_1 = require("../project/uploadAccountScopedProjectSourceAsync");
const User_1 = require("../user/User");
const promise_1 = require("../utils/promise");
const vcs_1 = require("../vcs");
// Expo Go release info - update when releasing a new version
const EXPO_GO_SDK_VERSION = '55';
const EXPO_GO_APP_VERSION = '55.0.11';
const EXPO_GO_BUILD_NUMBER = '1017799';
const TESTFLIGHT_GROUP_NAME = 'Team (Expo)';
async function setupTestFlightAsync(ascApp) {
    // Create or get TestFlight group
    let group;
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            const groups = await ascApp.getBetaGroupsAsync({
                query: { includes: ['betaTesters'] },
            });
            group = groups.find(g => g.attributes.isInternalGroup && g.attributes.name === TESTFLIGHT_GROUP_NAME);
            if (!group) {
                group = await ascApp.createBetaGroupAsync({
                    name: TESTFLIGHT_GROUP_NAME,
                    isInternalGroup: true,
                    hasAccessToAllBuilds: true,
                });
            }
            break;
        }
        catch (error) {
            // Apple returns this error when the app isn't ready yet
            if (error?.data?.errors?.some((e) => e.code === 'ENTITY_ERROR.RELATIONSHIP.INVALID')) {
                if (attempt < 9) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    continue;
                }
            }
            throw error;
        }
    }
    if (!group) {
        throw new Error('Failed to create TestFlight group');
    }
    const users = await apple_utils_1.User.getAsync(ascApp.context);
    const admins = users.filter(u => u.attributes.roles?.includes(apple_utils_1.UserRole.ADMIN));
    const existingEmails = new Set(group.attributes.betaTesters?.map((t) => t.attributes.email?.toLowerCase()) ?? []);
    const newTesters = admins
        .filter(u => u.attributes.email && !existingEmails.has(u.attributes.email.toLowerCase()))
        .map(u => ({
        email: u.attributes.email,
        firstName: u.attributes.firstName ?? '',
        lastName: u.attributes.lastName ?? '',
    }));
    if (newTesters.length > 0) {
        await group.createBulkBetaTesterAssignmentsAsync(newTesters);
    }
}
/* eslint-disable no-console */
async function withSuppressedOutputAsync(fn) {
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    let capturedOutput = '';
    const capture = (chunk) => {
        if (typeof chunk === 'string') {
            capturedOutput += chunk;
        }
        return true;
    };
    // Only suppress stdout, not stderr — ora writes spinner frames to stderr and
    // patching it would freeze the spinner animation during suppressed async work.
    process.stdout.write = capture;
    console.log = () => { };
    console.error = () => { };
    console.warn = () => { };
    try {
        return await fn();
    }
    catch (error) {
        process.stdout.write = originalStdoutWrite;
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        if (capturedOutput) {
            originalConsoleLog(capturedOutput);
        }
        throw error;
    }
    finally {
        process.stdout.write = originalStdoutWrite;
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    }
}
/* eslint-enable no-console */
class Go extends EasCommand_1.default {
    static description = 'Create a custom Expo Go and submit to TestFlight';
    static hidden = true;
    static flags = {
        'bundle-id': core_1.Flags.string({
            description: 'iOS bundle identifier (auto-generated if not provided)',
            required: false,
        }),
        name: core_1.Flags.string({
            description: 'App name',
            default: 'My Expo Go',
        }),
        credentials: core_1.Flags.boolean({
            description: 'Interactively select credentials (default: auto-select)',
            default: false,
        }),
    };
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.Analytics,
    };
    async runAsync() {
        log_1.default.log(chalk_1.default.bold(`Creating your personal Expo Go and deploying to TestFlight. ${(0, log_1.learnMore)('https://expo.fyi/deploy-expo-go-testflight')}`));
        const { flags } = await this.parse(Go);
        const { loggedIn: { actor, graphqlClient }, analytics, } = await this.getContextAsync(Go, {
            nonInteractive: false,
        });
        log_1.default.withTick(`Logged in as ${chalk_1.default.cyan((0, User_1.getActorDisplayName)(actor))}`);
        const bundleId = flags['bundle-id'] ?? this.generateBundleId(actor);
        const appName = flags.name ?? 'My Expo Go';
        const slug = bundleId.split('.').pop() || 'my-expo-go';
        const projectDir = path.join(os.tmpdir(), `eas-go-${slug}`);
        await fs.emptyDir(projectDir);
        const originalCwd = process.cwd();
        process.chdir(projectDir);
        const setupSpinner = (0, ora_1.ora)('Creating project...').start();
        // Step 1: Create project files and initialize git (silently)
        try {
            await withSuppressedOutputAsync(async () => {
                await this.createProjectFilesAsync(projectDir, bundleId, appName);
                await this.initGitRepoAsync(projectDir);
            });
            const vcsClient = (0, vcs_1.resolveVcsClient)();
            // Step 2: Create/link EAS project (silently)
            const projectId = await withSuppressedOutputAsync(() => this.ensureEasProjectAsync(graphqlClient, actor, projectDir, bundleId));
            // Step 3: Set up iOS credentials and create App Store Connect app
            const ascApp = await this.setupCredentialsAsync(projectDir, projectId, bundleId, appName, graphqlClient, actor, analytics, vcsClient, flags.credentials, () => {
                setupSpinner.stop();
                log_1.default.markFreshLine();
            });
            // Step 4: Start workflow and monitor progress
            const { workflowUrl, workflowRunId } = await this.runWorkflowAsync(graphqlClient, projectDir, projectId, actor, vcsClient);
            log_1.default.withTick(`Workflow started: ${chalk_1.default.cyan(workflowUrl)}`);
            const status = await this.monitorWorkflowJobsAsync(graphqlClient, workflowRunId);
            if (status === generated_1.WorkflowRunStatus.Failure) {
                throw new Error('Workflow failed');
            }
            else if (status === generated_1.WorkflowRunStatus.Canceled) {
                throw new Error('Workflow was canceled');
            }
            // Step 5: Set up TestFlight group (silently)
            try {
                await setupTestFlightAsync(ascApp);
            }
            catch {
                // Non-fatal: TestFlight group setup failure shouldn't block the user
            }
            log_1.default.newLine();
            log_1.default.succeed(`Done! Your custom Expo Go has been submitted to TestFlight. ${(0, log_1.learnMore)(`https://appstoreconnect.apple.com/apps/${ascApp.id}/testflight`, { learnMoreMessage: 'Open it on App Store Connect' })}`);
            log_1.default.log(`App Store processing may take several minutes to complete. ${(0, log_1.learnMore)('https://expo.fyi/personal-expo-go', { learnMoreMessage: 'Learn more about Expo Go on TestFlight' })}`);
            await fs.remove(projectDir);
        }
        catch (error) {
            log_1.default.gray(`Project files preserved for debugging: ${projectDir}`);
            throw error;
        }
        finally {
            process.chdir(originalCwd);
        }
    }
    generateBundleId(actor) {
        const username = actor.accounts[0].name;
        // Sanitize username for bundle ID: only alphanumeric and hyphens allowed
        const sanitizedUsername = username
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
        // Deterministic bundle ID per user + SDK version (reuses same ASC app)
        return `com.${sanitizedUsername || 'app'}.expogo${EXPO_GO_SDK_VERSION}`;
    }
    async createProjectFilesAsync(projectDir, bundleId, appName) {
        const slug = bundleId.split('.').pop() || 'custom-expo-go';
        const extensionBundleId = `${bundleId}.ExpoNotificationServiceExtension`;
        const appJson = {
            expo: {
                name: appName,
                slug,
                version: EXPO_GO_APP_VERSION,
                ios: {
                    bundleIdentifier: bundleId,
                    buildNumber: EXPO_GO_BUILD_NUMBER,
                    config: {
                        usesNonExemptEncryption: false,
                    },
                },
                extra: {
                    eas: {
                        build: {
                            experimental: {
                                ios: {
                                    appExtensions: [
                                        {
                                            targetName: 'ExpoNotificationServiceExtension',
                                            bundleIdentifier: extensionBundleId,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        };
        const easJson = {
            cli: {
                version: '>= 5.0.0',
            },
            build: {
                production: {
                    distribution: 'store',
                    credentialsSource: 'remote',
                },
            },
            submit: {
                production: {
                    ios: {},
                },
            },
        };
        const packageJson = {
            name: slug,
            version: '1.0.0',
            dependencies: {
                expo: '~54.0.0',
            },
        };
        await fs.writeJson(path.join(projectDir, 'app.json'), appJson, { spaces: 2 });
        await fs.writeJson(path.join(projectDir, 'eas.json'), easJson, { spaces: 2 });
        await fs.writeJson(path.join(projectDir, 'package.json'), packageJson, { spaces: 2 });
        await (0, spawn_async_1.default)('npm', ['install'], { cwd: projectDir });
    }
    async initGitRepoAsync(projectDir) {
        await (0, spawn_async_1.default)('git', ['init'], { cwd: projectDir });
        await (0, spawn_async_1.default)('git', ['add', '.'], { cwd: projectDir });
        await (0, spawn_async_1.default)('git', ['commit', '-m', 'Initial commit'], { cwd: projectDir });
    }
    async ensureEasProjectAsync(graphqlClient, actor, projectDir, bundleId) {
        const slug = bundleId.split('.').pop() || 'custom-expo-go';
        const account = actor.accounts[0];
        const existingProjectId = await (0, fetchOrCreateProjectIDForWriteToConfigWithConfirmationAsync_1.findProjectIdByAccountNameAndSlugNullableAsync)(graphqlClient, account.name, slug);
        if (existingProjectId) {
            await (0, getProjectIdAsync_1.saveProjectIdToAppConfigAsync)(projectDir, existingProjectId);
            return existingProjectId;
        }
        const projectId = await AppMutation_1.AppMutation.createAppAsync(graphqlClient, {
            accountId: account.id,
            projectName: slug,
        });
        await (0, getProjectIdAsync_1.saveProjectIdToAppConfigAsync)(projectDir, projectId);
        return projectId;
    }
    async setupCredentialsAsync(projectDir, projectId, bundleId, appName, graphqlClient, actor, analytics, vcsClient, customizeCreds, onBeforeAppleAuth) {
        const exp = await (0, expoConfig_1.getPrivateExpoConfigAsync)(projectDir);
        const extensionBundleId = `${bundleId}.ExpoNotificationServiceExtension`;
        const credentialsCtx = new context_1.CredentialsContext({
            projectInfo: { exp, projectId },
            nonInteractive: false,
            autoAcceptCredentialReuse: !customizeCreds,
            projectDir,
            user: actor,
            graphqlClient,
            analytics,
            vcsClient,
        });
        onBeforeAppleAuth?.();
        const userAuthCtx = await credentialsCtx.appStore.ensureUserAuthenticatedAsync();
        const app = await (0, BuildCredentialsUtils_1.getAppFromContextAsync)(credentialsCtx);
        const targets = [
            {
                targetName: exp.slug,
                bundleIdentifier: bundleId,
                entitlements: {},
            },
            {
                targetName: 'ExpoNotificationServiceExtension',
                bundleIdentifier: extensionBundleId,
                parentBundleIdentifier: bundleId,
                entitlements: {},
            },
        ];
        const ascApp = await withSuppressedOutputAsync(async () => {
            await new SetUpBuildCredentials_1.SetUpBuildCredentials({
                app,
                targets,
                distribution: 'store',
            }).runAsync(credentialsCtx);
            const appLookupParams = {
                ...app,
                bundleIdentifier: bundleId,
            };
            await new SetUpAscApiKey_1.SetUpAscApiKey(appLookupParams, AscApiKeyUtils_1.AppStoreApiKeyPurpose.SUBMISSION_SERVICE).runAsync(credentialsCtx);
            const ascAppResult = await (0, ensureAppExists_1.ensureAppExistsAsync)(userAuthCtx, {
                name: appName,
                bundleIdentifier: bundleId,
            });
            const easJsonPath = path.join(projectDir, 'eas.json');
            const easJson = await fs.readJson(easJsonPath);
            easJson.submit = easJson.submit || {};
            easJson.submit.production = easJson.submit.production || {};
            easJson.submit.production.ios = easJson.submit.production.ios || {};
            easJson.submit.production.ios.ascAppId = ascAppResult.id;
            await fs.writeJson(easJsonPath, easJson, { spaces: 2 });
            await (0, spawn_async_1.default)('git', ['add', 'eas.json'], { cwd: projectDir });
            await (0, spawn_async_1.default)('git', ['commit', '-m', 'Add ascAppId to eas.json'], { cwd: projectDir });
            return ascAppResult;
        });
        // Set up push notifications (outside suppressed block so prompts are visible)
        const appLookupParamsForPushKey = { ...app, bundleIdentifier: bundleId };
        const setupPushKeyAction = new SetUpPushKey_1.SetUpPushKey(appLookupParamsForPushKey);
        const isPushKeySetup = await setupPushKeyAction.isPushKeySetupAsync(credentialsCtx);
        if (!isPushKeySetup) {
            if (customizeCreds) {
                const wantsPushNotifications = await (0, prompts_1.confirmAsync)({
                    message: 'Would you like to set up Push Notifications for your app?',
                    initial: true,
                });
                if (wantsPushNotifications) {
                    await setupPushKeyAction.runAsync(credentialsCtx);
                }
            }
            else {
                await setupPushKeyAction.runAsync(credentialsCtx);
            }
        }
        return ascApp;
    }
    async runWorkflowAsync(graphqlClient, projectDir, projectId, actor, vcsClient) {
        const account = actor.accounts[0];
        const { projectArchiveBucketKey, easJsonBucketKey, packageJsonBucketKey } = await withSuppressedOutputAsync(async () => {
            const { projectArchiveBucketKey } = await (0, uploadAccountScopedProjectSourceAsync_1.uploadAccountScopedProjectSourceAsync)({
                graphqlClient,
                vcsClient,
                accountId: account.id,
            });
            const { fileBucketKey: easJsonBucketKey } = await (0, uploadAccountScopedFileAsync_1.uploadAccountScopedFileAsync)({
                graphqlClient,
                accountId: account.id,
                filePath: path.join(projectDir, 'eas.json'),
                maxSizeBytes: 1024 * 1024,
            });
            const { fileBucketKey: packageJsonBucketKey } = await (0, uploadAccountScopedFileAsync_1.uploadAccountScopedFileAsync)({
                graphqlClient,
                accountId: account.id,
                filePath: path.join(projectDir, 'package.json'),
                maxSizeBytes: 1024 * 1024,
            });
            return { projectArchiveBucketKey, easJsonBucketKey, packageJsonBucketKey };
        });
        const { id: workflowRunId } = await WorkflowRunMutation_1.WorkflowRunMutation.createExpoGoRepackWorkflowRunAsync(graphqlClient, {
            appId: projectId,
            projectSource: {
                type: generated_1.WorkflowProjectSourceType.Gcs,
                projectArchiveBucketKey,
                easJsonBucketKey,
                packageJsonBucketKey,
                projectRootDirectory: '.',
            },
        });
        const app = await AppQuery_1.AppQuery.byIdAsync(graphqlClient, projectId);
        const workflowUrl = `https://expo.dev/accounts/${account.name}/projects/${app.slug}/workflows/${workflowRunId}`;
        return { workflowUrl, workflowRunId };
    }
    async monitorWorkflowJobsAsync(graphqlClient, workflowRunId) {
        const EXPECTED_BUILD_DURATION_SECONDS = 5 * 60;
        const EXPECTED_SUBMIT_DURATION_SECONDS = 2 * 60;
        const buildStartTime = Date.now();
        let submitStartTime = null;
        const buildSpinner = (0, ora_1.ora)(this.formatSpinnerText('Building Expo Go', EXPECTED_BUILD_DURATION_SECONDS, buildStartTime)).start();
        let submitSpinner = null;
        let buildCompleted = false;
        let failedFetchesCount = 0;
        while (true) {
            if (!buildCompleted) {
                buildSpinner.text = this.formatSpinnerText('Building Expo Go', EXPECTED_BUILD_DURATION_SECONDS, buildStartTime);
            }
            if (submitSpinner && submitStartTime) {
                submitSpinner.text = this.formatSpinnerText('Submitting to TestFlight', EXPECTED_SUBMIT_DURATION_SECONDS, submitStartTime);
            }
            try {
                const workflowRun = await WorkflowRunQuery_1.WorkflowRunQuery.withJobsByIdAsync(graphqlClient, workflowRunId, {
                    useCache: false,
                });
                failedFetchesCount = 0;
                const repackJob = workflowRun.jobs.find(j => j.name === 'Repack Expo Go');
                const submitJob = workflowRun.jobs.find(j => j.name === 'Submit to TestFlight');
                if (!buildCompleted) {
                    if (repackJob?.status === generated_1.WorkflowJobStatus.Success) {
                        buildSpinner.succeed('Built Expo Go');
                        buildCompleted = true;
                    }
                    else if (repackJob?.status === generated_1.WorkflowJobStatus.Failure ||
                        repackJob?.status === generated_1.WorkflowJobStatus.Canceled) {
                        buildSpinner.fail('Build failed');
                        return generated_1.WorkflowRunStatus.Failure;
                    }
                }
                if (buildCompleted && submitSpinner === null && submitJob) {
                    submitStartTime = Date.now();
                    submitSpinner = (0, ora_1.ora)(this.formatSpinnerText('Submitting to TestFlight', EXPECTED_SUBMIT_DURATION_SECONDS, submitStartTime)).start();
                }
                if (workflowRun.status === generated_1.WorkflowRunStatus.Success) {
                    submitSpinner?.stop();
                    return generated_1.WorkflowRunStatus.Success;
                }
                else if (workflowRun.status === generated_1.WorkflowRunStatus.Failure) {
                    buildSpinner.stop();
                    submitSpinner?.fail('Submission failed');
                    return generated_1.WorkflowRunStatus.Failure;
                }
                else if (workflowRun.status === generated_1.WorkflowRunStatus.Canceled) {
                    buildSpinner.stop();
                    submitSpinner?.stop();
                    return generated_1.WorkflowRunStatus.Canceled;
                }
            }
            catch {
                failedFetchesCount++;
                if (failedFetchesCount > 6) {
                    buildSpinner.fail();
                    submitSpinner?.fail();
                    throw new Error('Failed to fetch the workflow run status 6 times in a row');
                }
            }
            await (0, promise_1.sleepAsync)(10 * 1000);
        }
    }
    formatSpinnerText(label, expectedDurationSeconds, startTime) {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const remainingSeconds = Math.max(0, expectedDurationSeconds - elapsedSeconds);
        if (remainingSeconds === 0) {
            return `${label} (almost done...)`;
        }
        const minutes = Math.ceil(remainingSeconds / 60);
        const unit = minutes === 1 ? 'minute' : 'minutes';
        return `${label} (~${minutes} ${unit} remaining)`;
    }
}
exports.default = Go;
