"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const fs = tslib_1.__importStar(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const flags_1 = require("../../commandUtils/flags");
const generated_1 = require("../../graphql/generated");
const EnvironmentVariablesQuery_1 = require("../../graphql/queries/EnvironmentVariablesQuery");
const log_1 = tslib_1.__importDefault(require("../../log"));
const prompts_1 = require("../../prompts");
const prompts_2 = require("../../utils/prompts");
class EnvPull extends EasCommand_1.default {
    static description = 'pull environment variables for the selected environment to .env file';
    static contextDefinition = {
        ...this.ContextOptions.ProjectId,
        ...this.ContextOptions.LoggedIn,
        ...this.ContextOptions.ProjectDir,
    };
    static args = {
        environment: core_1.Args.string({
            description: "Environment to pull variables from. Default environments are 'production', 'preview', and 'development'.",
            required: false,
        }),
    };
    static flags = {
        ...flags_1.EASNonInteractiveFlag,
        ...flags_1.EASEnvironmentFlag,
        path: core_1.Flags.string({
            description: 'Path to the result `.env` file',
            default: '.env.local',
        }),
    };
    async runAsync() {
        let { args: { environment: argEnvironment }, flags: { environment: flagEnvironment, path: targetPath, 'non-interactive': nonInteractive }, } = await this.parse(EnvPull);
        let environment = flagEnvironment?.toLowerCase() ?? argEnvironment?.toLowerCase();
        const { projectId, loggedIn: { graphqlClient }, projectDir, } = await this.getContextAsync(EnvPull, {
            nonInteractive,
        });
        if (!environment) {
            environment = await (0, prompts_2.promptVariableEnvironmentAsync)({
                nonInteractive,
                graphqlClient,
                projectId,
            });
        }
        targetPath = targetPath ?? '.env.local';
        const environmentVariables = await EnvironmentVariablesQuery_1.EnvironmentVariablesQuery.byAppIdWithSensitiveAsync(graphqlClient, {
            appId: projectId,
            environment,
            includeFileContent: true,
        });
        if (!nonInteractive && (await fs.exists(targetPath))) {
            const result = await (0, prompts_1.confirmAsync)({
                message: `File ${targetPath} already exists. Do you want to overwrite it?`,
            });
            if (!result) {
                log_1.default.log('Aborting...');
                throw new Error(`File ${targetPath} already exists.`);
            }
        }
        let currentEnvLocal = {};
        if (await fs.exists(targetPath)) {
            currentEnvLocal = dotenv_1.default.parse(await fs.readFile(targetPath, 'utf8'));
        }
        const filePrefix = `# Environment: ${environment.toLocaleLowerCase()}\n\n`;
        const isFileVariablePresent = environmentVariables.some(v => {
            return v.type === generated_1.EnvironmentSecretType.FileBase64 && v.valueWithFileContent;
        });
        const envDir = path_1.default.join(projectDir, '.eas', '.env');
        if (isFileVariablePresent) {
            await fs.mkdir(envDir, { recursive: true });
        }
        const skippedSecretVariables = [];
        const overridenSecretVariables = [];
        const envFileContentLines = await Promise.all(environmentVariables.map(async (variable) => {
            if (variable.visibility === generated_1.EnvironmentVariableVisibility.Secret) {
                if (currentEnvLocal[variable.name]) {
                    overridenSecretVariables.push(variable.name);
                    return `${variable.name}=${currentEnvLocal[variable.name]}`;
                }
                skippedSecretVariables.push(variable.name);
                return `# ${variable.name}=***** (secret)`;
            }
            if (variable.type === generated_1.EnvironmentSecretType.FileBase64 && variable.valueWithFileContent) {
                const filePath = path_1.default.join(envDir, variable.name);
                await fs.writeFile(filePath, variable.valueWithFileContent, 'base64');
                return `${variable.name}=${filePath}`;
            }
            return `${variable.name}=${variable.value}`;
        }));
        await fs.writeFile(targetPath, filePrefix + envFileContentLines.join('\n'));
        log_1.default.log(`Pulled plain text and sensitive environment variables from "${environment.toLowerCase()}" environment to ${targetPath}.`);
        if (overridenSecretVariables.length > 0) {
            log_1.default.addNewLineIfNone();
            log_1.default.log(`Reused local values for following secrets: ${overridenSecretVariables.join('\n')}.`);
        }
        if (skippedSecretVariables.length > 0) {
            log_1.default.addNewLineIfNone();
            log_1.default.log(`The following variables have the secret visibility and can't be read outside of EAS servers. Set their values manually in your .env file: ${skippedSecretVariables.join(', ')}.`);
        }
    }
}
exports.default = EnvPull;
