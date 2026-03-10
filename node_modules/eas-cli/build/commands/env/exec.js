"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const spawn_async_1 = tslib_1.__importDefault(require("@expo/spawn-async"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const EnvironmentVariablesQuery_1 = require("../../graphql/queries/EnvironmentVariablesQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../utils/prompts");
class EnvExec extends EasCommand_1.default {
    static description = 'execute a command with environment variables from the selected environment';
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
    };
    static flags = {
        ...flags_1.EASNonInteractiveFlag,
    };
    static args = {
        environment: core_1.Args.string({
            required: true,
            description: "Environment to execute the command in. Default environments are 'production', 'preview', and 'development'.",
        }),
        bash_command: core_1.Args.string({
            required: true,
            description: 'bash command to execute with the environment variables from the environment',
        }),
    };
    isNonInteractive = false;
    async runAsync() {
        const { flags, args } = await this.parse(EnvExec);
        const parsedFlags = this.sanitizeFlagsAndArgs(flags, args);
        const { projectId, loggedIn: { graphqlClient }, } = await this.getContextAsync(EnvExec, {
            nonInteractive: parsedFlags.nonInteractive,
        });
        this.isNonInteractive = parsedFlags.nonInteractive;
        const environment = parsedFlags.environment ??
            (await (0, prompts_1.promptVariableEnvironmentAsync)({
                nonInteractive: parsedFlags.nonInteractive,
                graphqlClient,
                projectId,
            }));
        const environmentVariables = await this.loadEnvironmentVariablesAsync({
            graphqlClient,
            projectId,
            environment,
            nonInteractive: parsedFlags.nonInteractive,
        });
        if (parsedFlags.nonInteractive) {
            await this.runCommandNonInteractiveWithEnvVarsAsync({
                command: parsedFlags.command,
                environmentVariables,
            });
        }
        else {
            await this.runCommandWithEnvVarsAsync({
                command: parsedFlags.command,
                environmentVariables,
            });
        }
    }
    sanitizeFlagsAndArgs(rawFlags, { bash_command, environment }) {
        if (rawFlags['non-interactive'] && (!bash_command || !environment)) {
            throw new Error("You must specify both environment and bash command when running in non-interactive mode. Run command as `eas env:exec ENVIRONMENT 'bash command'`.");
        }
        const firstChar = bash_command[0];
        const lastChar = bash_command[bash_command.length - 1];
        const cleanCommand = (firstChar === '"' && lastChar === '"') || (firstChar === "'" && lastChar === "'")
            ? bash_command.slice(1, -1)
            : bash_command;
        return {
            nonInteractive: rawFlags['non-interactive'],
            environment,
            command: cleanCommand,
        };
    }
    // eslint-disable-next-line async-protect/async-suffix
    async catch(err) {
        // when in non-interactive, make the behavior of this command a pure passthrough, outputting only the subprocess' stdout and stderr and exiting with the
        // sub-command's exit status
        if (this.isNonInteractive) {
            process.exitCode = process.exitCode ?? err.status ?? 1;
        }
        else {
            await super.catch(err);
        }
    }
    async runCommandNonInteractiveWithEnvVarsAsync({ command, environmentVariables, }) {
        await (0, spawn_async_1.default)(command, [], {
            shell: true,
            stdio: 'inherit',
            env: {
                ...process.env,
                ...environmentVariables,
            },
        });
    }
    async runCommandWithEnvVarsAsync({ command, environmentVariables, }) {
        log_1.default.log(`Running command: ${chalk_1.default.bold(command)}`);
        const spawnPromise = (0, spawn_async_1.default)(command, [], {
            shell: true,
            stdio: ['inherit', 'pipe', 'pipe'],
            env: {
                ...process.env,
                ...environmentVariables,
            },
        });
        const { child: { stdout, stderr }, } = spawnPromise;
        if (!stdout || !stderr) {
            throw new Error(`Failed to spawn ${command}`);
        }
        stdout.on('data', data => {
            for (const line of data.toString().trim().split('\n')) {
                log_1.default.log(`${chalk_1.default.gray('[stdout]')} ${line}`);
            }
        });
        stderr.on('data', data => {
            for (const line of data.toString().trim().split('\n')) {
                log_1.default.warn(`${chalk_1.default.gray('[stderr]')} ${line}`);
            }
        });
        try {
            await spawnPromise;
        }
        catch (error) {
            log_1.default.error(`❌ ${chalk_1.default.bold(command)} failed`);
            throw error;
        }
    }
    async loadEnvironmentVariablesAsync({ graphqlClient, projectId, environment, nonInteractive, }) {
        const environmentVariablesQueryResult = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdWithSensitiveAsync(graphqlClient, {
            appId: projectId,
            environment,
        });
        const nonSecretEnvironmentVariables = environmentVariablesQueryResult.filter(({ value }) => !!value);
        if (!nonInteractive) {
            if (nonSecretEnvironmentVariables.length > 0) {
                log_1.default.log(`Environment variables with visibility "Plain text" and "Sensitive" loaded from the "${environment.toLowerCase()}" environment on EAS: ${nonSecretEnvironmentVariables
                    .map(e => e.name)
                    .join(', ')}.`);
            }
            else {
                log_1.default.log(`No environment variables with visibility "Plain text" and "Sensitive" found for the "${environment.toLowerCase()}" environment on EAS.`);
            }
            log_1.default.newLine();
        }
        const environmentVariables = {};
        for (const { name, value } of nonSecretEnvironmentVariables) {
            if (value) {
                environmentVariables[name] = value;
            }
        }
        return environmentVariables;
    }
}
exports.default = EnvExec;
