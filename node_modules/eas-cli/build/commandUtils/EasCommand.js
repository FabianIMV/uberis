"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const core_2 = require("@urql/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const AnalyticsContextField_1 = tslib_1.__importDefault(require("./context/AnalyticsContextField"));
const DynamicLoggedInContextField_1 = tslib_1.__importDefault(require("./context/DynamicLoggedInContextField"));
const DynamicProjectConfigContextField_1 = require("./context/DynamicProjectConfigContextField");
const LoggedInContextField_1 = tslib_1.__importDefault(require("./context/LoggedInContextField"));
const MaybeLoggedInContextField_1 = tslib_1.__importDefault(require("./context/MaybeLoggedInContextField"));
const OptionalPrivateProjectConfigContextField_1 = require("./context/OptionalPrivateProjectConfigContextField");
const PrivateProjectConfigContextField_1 = require("./context/PrivateProjectConfigContextField");
const ProjectDirContextField_1 = tslib_1.__importDefault(require("./context/ProjectDirContextField"));
const ProjectIdContextField_1 = require("./context/ProjectIdContextField");
const ServerSideEnvironmentVariablesContextField_1 = require("./context/ServerSideEnvironmentVariablesContextField");
const SessionManagementContextField_1 = tslib_1.__importDefault(require("./context/SessionManagementContextField"));
const VcsClientContextField_1 = tslib_1.__importDefault(require("./context/VcsClientContextField"));
const errors_1 = require("./errors");
const AnalyticsManager_1 = require("../analytics/AnalyticsManager");
const log_1 = tslib_1.__importStar(require("../log"));
const SessionManager_1 = tslib_1.__importDefault(require("../user/SessionManager"));
const BASE_GRAPHQL_ERROR_MESSAGE = 'GraphQL request failed.';
class EasCommand extends core_1.Command {
    static ContextOptions = {
        /**
         * Require this command to be run when logged-in. Returns the logged-in actor and a logged-in
         * graphql client in the context.
         */
        LoggedIn: {
            loggedIn: new LoggedInContextField_1.default(),
        },
        /**
         * Do not require this command to be run when logged-in, but if it is get the logged-in actor and a
         * maybe-logged-in graphql client.
         */
        MaybeLoggedIn: {
            maybeLoggedIn: new MaybeLoggedInContextField_1.default(),
        },
        /**
         * Specify this context if the logged-in requirement is only necessary in a particular execution of the command.
         */
        DynamicLoggedIn: {
            // eslint-disable-next-line async-protect/async-suffix
            getDynamicLoggedInAsync: new DynamicLoggedInContextField_1.default(),
        },
        /**
         * Specify this context requirement if the command needs to mutate the user session.
         * @deprecated Should not be used outside of session management commands, which currently only includes `login` and `logout`.
         */
        SessionManagment: {
            sessionManager: new SessionManagementContextField_1.default(),
        },
        /**
         * Require the project to be identified and registered on server if this command is being
         * run within a project directory, null otherwise.
         */
        OptionalProjectConfig: {
            optionalPrivateProjectConfig: new OptionalPrivateProjectConfigContextField_1.OptionalPrivateProjectConfigContextField(),
        },
        /**
         * Require this command to be run in a project directory. Return the project directory in the context.
         */
        ProjectDir: {
            projectDir: new ProjectDirContextField_1.default(),
        },
        /**
         * Provides functions to load the project config when dynamic config options are needed (custom Env for example).
         */
        DynamicProjectConfig: {
            // eslint-disable-next-line async-protect/async-suffix
            getDynamicPublicProjectConfigAsync: new DynamicProjectConfigContextField_1.DynamicPublicProjectConfigContextField(),
            // eslint-disable-next-line async-protect/async-suffix
            getDynamicPrivateProjectConfigAsync: new DynamicProjectConfigContextField_1.DynamicPrivateProjectConfigContextField(),
        },
        /**
         * Require the project to be identified and registered on server. Returns the project config in the context.
         * This also requires the user to be logged in (getProjectIdAsync requires logged in), so also expose that context.
         * Exposing the loggedIn context here helps us guarantee user identification for logging purposes.
         */
        ProjectConfig: {
            loggedIn: new LoggedInContextField_1.default(),
            privateProjectConfig: new PrivateProjectConfigContextField_1.PrivateProjectConfigContextField(),
        },
        /**
         * Analytics manager. Returns the analytics manager in the context for use by the command.
         */
        Analytics: {
            analytics: new AnalyticsContextField_1.default(),
        },
        Vcs: {
            vcsClient: new VcsClientContextField_1.default(),
        },
        ServerSideEnvironmentVariables: {
            // eslint-disable-next-line async-protect/async-suffix
            getServerSideEnvironmentVariablesAsync: new ServerSideEnvironmentVariablesContextField_1.ServerSideEnvironmentVariablesContextField(),
        },
        /**
         * Require the project to be identified and registered on server. Returns the project ID evaluated from the app config.
         */
        ProjectId: {
            projectId: new ProjectIdContextField_1.ProjectIdContextField(),
        },
    };
    /**
     * Context allows for subclasses (commands) to declare their prerequisites in a type-safe manner.
     * These declarative definitions each output a context property that is the result of the prerequisite being
     * satisfied. These allow a unified common interface to be shared amongst commands in order to provide a more
     * consistent CLI experience.
     *
     * For example, let's say a command needs the EAS project ID to make a GraphQL mutation. It should declare that
     * it requires the `ProjectConfig` context, and then call `getContextAsync` to get the project ID.
     */
    static contextDefinition = {};
    /**
     * The user session manager. Responsible for coordinating all user session related state.
     * If needed in a subclass, use the SessionManager ContextOption.
     */
    sessionManagerInternal;
    /**
     * The analytics manager. Used for logging analytics.
     * It is set up here to ensure a consistent setup.
     */
    analyticsInternal;
    /**
     * Execute the context in the contextDefinition to satisfy command prerequisites.
     */
    async getContextAsync(commandClass, { nonInteractive, vcsClientOverride, 
    // if specified and not null, the env vars from the selected environment will be fetched from the server
    // to resolve dynamic config (if dynamic config context is used) and enable getServerSideEnvironmentVariablesAsync function (if server side environment variables context is used)
    withServerSideEnvironment, }) {
        const contextDefinition = commandClass.contextDefinition;
        // do these serially so that they don't do things like ask for login twice in parallel
        const contextValuePairs = [];
        for (const [contextKey, contextField] of Object.entries(contextDefinition)) {
            contextValuePairs.push([
                contextKey,
                await contextField.getValueAsync({
                    nonInteractive,
                    sessionManager: this.sessionManager,
                    analytics: this.analytics,
                    vcsClientOverride,
                    withServerSideEnvironment,
                }),
            ]);
        }
        return Object.fromEntries(contextValuePairs);
    }
    get sessionManager() {
        return (0, nullthrows_1.default)(this.sessionManagerInternal);
    }
    get analytics() {
        return (0, nullthrows_1.default)(this.analyticsInternal);
    }
    // eslint-disable-next-line async-protect/async-suffix
    async run() {
        this.analyticsInternal = await (0, AnalyticsManager_1.createAnalyticsAsync)();
        this.sessionManagerInternal = new SessionManager_1.default(this.analytics);
        // this is needed for logEvent call below as it identifies the user in the analytics system
        // if possible
        await this.sessionManager.getUserAsync();
        this.analytics.logEvent(AnalyticsManager_1.CommandEvent.ACTION, {
            // id is assigned by oclif in constructor based on the filepath:
            // commands/submit === submit, commands/build/list === build:list
            action: `eas ${this.id}`,
        });
        return await this.runAsync();
    }
    // eslint-disable-next-line async-protect/async-suffix
    async finally(err) {
        await this.analytics.flushAsync();
        return await super.finally(err);
    }
    catch(err) {
        let baseMessage = `${this.id} command failed.`;
        if (err instanceof errors_1.EasCommandError) {
            log_1.default.error(err.message);
        }
        else if (err instanceof core_2.CombinedError && err?.graphQLErrors) {
            const cleanGQLErrorsMessage = err?.graphQLErrors
                .map((graphQLError) => {
                const messageLine = graphQLError.message.replace('[GraphQL] ', '');
                const requestIdLine = graphQLError.extensions?.requestId
                    ? `\nRequest ID: ${err.graphQLErrors[0].extensions.requestId}`
                    : '';
                const defaultMsg = `${messageLine}${requestIdLine}`;
                if (graphQLError.extensions?.errorCode === 'UNAUTHORIZED_ERROR') {
                    if (defaultMsg.includes('ScopedAccountActorViewerContext') && process.env.EAS_BUILD) {
                        // We're in EAS, authenticated with a scoped account actor access token.
                        // We may have not added the scoped actor privacy rule to the right place yet.
                        return `${chalk_1.default.bold(`You don't have the required permissions to perform this operation.`)}\n\nWe are in the process of migrating EAS to a more granular permissioning system. If you believe what you're doing is a legitimate operation you should be able to perform, report this to us at ${(0, log_1.link)('https://expo.dev/contact')}\n\nOriginal error message: ${defaultMsg}`;
                    }
                    return `${chalk_1.default.bold(`You don't have the required permissions to perform this operation.`)}\n\nThis can sometimes happen if you are logged in as incorrect user.\nRun ${chalk_1.default.bold('eas whoami')} to check the username you are logged in as.\nRun ${chalk_1.default.bold('eas login')} to change the account.\n\nOriginal error message: ${defaultMsg}`;
                }
                return defaultMsg;
            })
                .join('\n');
            const cleanMessage = err.networkError
                ? `${cleanGQLErrorsMessage}\n${err.networkError.message}`
                : cleanGQLErrorsMessage;
            log_1.default.error(cleanMessage);
            baseMessage = BASE_GRAPHQL_ERROR_MESSAGE;
        }
        else {
            log_1.default.error(err.message);
        }
        log_1.default.debug(err);
        const sanitizedError = new Error(baseMessage);
        sanitizedError.stack = err.stack;
        throw sanitizedError;
    }
}
exports.default = EasCommand;
