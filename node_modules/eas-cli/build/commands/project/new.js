"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConfigsAsync = generateConfigsAsync;
exports.createProjectAsync = createProjectAsync;
exports.generateProjectFilesAsync = generateProjectFilesAsync;
const tslib_1 = require("tslib");
const core_1 = require("@oclif/core");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const nullthrows_1 = tslib_1.__importDefault(require("nullthrows"));
const url_1 = require("../../build/utils/url");
const EasCommand_1 = tslib_1.__importDefault(require("../../commandUtils/EasCommand"));
const commands_1 = require("../../commandUtils/new/commands");
const configs_1 = require("../../commandUtils/new/configs");
const projectFiles_1 = require("../../commandUtils/new/projectFiles");
const utils_1 = require("../../commandUtils/new/utils");
const AppMutation_1 = require("../../graphql/mutations/AppMutation");
const AppQuery_1 = require("../../graphql/queries/AppQuery");
const log_1 = tslib_1.__importStar(require("../../log"));
const installDependencies_1 = require("../../onboarding/installDependencies");
const ora_1 = require("../../ora");
const expoConfig_1 = require("../../project/expoConfig");
async function generateConfigsAsync(args, actor, graphqlClient) {
    const projectAccount = await (0, configs_1.promptForProjectAccountAsync)(actor);
    const { projectName, projectDirectory } = await (0, configs_1.generateProjectConfigAsync)(args.path, {
        graphqlClient,
        projectAccount,
    });
    return {
        projectAccount,
        projectDirectory,
        projectName,
    };
}
async function createProjectAsync({ graphqlClient, actor, projectDirectory, projectAccount, projectName, }) {
    const projectFullName = `@${projectAccount}/${projectName}`;
    const projectDashboardUrl = (0, url_1.getProjectDashboardUrl)(projectAccount, projectName);
    const projectLink = (0, log_1.link)(projectDashboardUrl, { text: projectFullName });
    const account = (0, nullthrows_1.default)(actor.accounts.find(a => a.name === projectAccount));
    const spinner = (0, ora_1.ora)(`Creating ${chalk_1.default.bold(projectFullName)}`).start();
    let projectId;
    try {
        projectId = await AppMutation_1.AppMutation.createAppAsync(graphqlClient, {
            accountId: account.id,
            projectName,
        });
        spinner.succeed(`Created ${chalk_1.default.bold(projectLink)}`);
    }
    catch (err) {
        spinner.fail();
        throw err;
    }
    const exp = await (0, expoConfig_1.getPrivateExpoConfigAsync)(projectDirectory, { skipPlugins: true });
    await (0, expoConfig_1.createOrModifyExpoConfigAsync)(projectDirectory, {
        extra: { ...exp.extra, eas: { ...exp.extra?.eas, projectId } },
    }, { skipSDKVersionRequirement: true });
    log_1.default.withInfo(`Project successfully linked (ID: ${chalk_1.default.bold(projectId)})`);
    return projectId;
}
async function generateProjectFilesAsync(projectDir, app, packageManager) {
    const spinner = (0, ora_1.ora)(`Generating project files`).start();
    await (0, projectFiles_1.generateAppConfigAsync)(projectDir, app);
    await (0, projectFiles_1.generateEasConfigAsync)(projectDir);
    await (0, projectFiles_1.updatePackageJsonAsync)(projectDir);
    await (0, projectFiles_1.copyProjectTemplatesAsync)(projectDir);
    await (0, projectFiles_1.updateReadmeAsync)(projectDir, packageManager);
    spinner.succeed(`Generated project files`);
    log_1.default.withInfo(`Generated ${chalk_1.default.bold('app.json')}. ${(0, log_1.learnMore)('https://docs.expo.dev/versions/latest/config/app/')}`);
    log_1.default.withInfo(`Generated ${chalk_1.default.bold('eas.json')}. ${(0, log_1.learnMore)('https://docs.expo.dev/build-reference/eas-json/')}`);
}
class New extends EasCommand_1.default {
    static aliases = ['new'];
    static description = 'Create a new project configured with Expo Application Services (EAS)';
    static args = {
        path: core_1.Args.string({
            description: 'Path to create the project (defaults to current directory)',
            required: false,
        }),
    };
    static flags = {
        'package-manager': core_1.Flags.option({
            char: 'p',
            description: 'Package manager to use for installing dependencies',
            options: [...installDependencies_1.PACKAGE_MANAGERS],
            default: 'npm',
        })(),
    };
    static contextDefinition = {
        ...this.ContextOptions.LoggedIn,
    };
    async runAsync() {
        const { args, flags } = await this.parse(New);
        const { loggedIn: { actor, graphqlClient }, } = await this.getContextAsync(New, { nonInteractive: false });
        if (actor.__typename === 'Robot') {
            throw new Error('This command is not available for robot users. Make sure you are not using a robot token and try again.');
        }
        log_1.default.log(`👋 Welcome to Expo, ${actor.username}!`);
        const { projectName, projectDirectory: targetProjectDirectory, projectAccount, } = await generateConfigsAsync(args, actor, graphqlClient);
        const projectDirectory = await (0, commands_1.cloneTemplateAsync)(targetProjectDirectory);
        const packageManager = flags['package-manager'];
        await (0, commands_1.installProjectDependenciesAsync)(projectDirectory, packageManager);
        const projectId = await createProjectAsync({
            projectDirectory,
            projectAccount,
            projectName,
            actor,
            graphqlClient,
        });
        const app = await AppQuery_1.AppQuery.byIdAsync(graphqlClient, projectId);
        await generateProjectFilesAsync(projectDirectory, app, packageManager);
        await (0, commands_1.initializeGitRepositoryAsync)(projectDirectory);
        log_1.default.log('🎉 We finished creating your new project.');
        log_1.default.newLine();
        log_1.default.log('Next steps:');
        log_1.default.withInfo(`Run ${chalk_1.default.bold(`cd ${(0, utils_1.printDirectory)(projectDirectory)}`)} to navigate to your project.`);
        log_1.default.withInfo(`Run ${chalk_1.default.bold(`${packageManager} run draft`)} to create a preview on EAS. ${(0, log_1.learnMore)('https://docs.expo.dev/eas/workflows/examples/publish-preview-update/')}`);
        log_1.default.withInfo(`Run ${chalk_1.default.bold(`${packageManager} run start`)} to start developing locally. ${(0, log_1.learnMore)('https://docs.expo.dev/get-started/start-developing/')}`);
        log_1.default.withInfo(`See the ${chalk_1.default.bold('README.md')} for more information about your project.`);
    }
}
exports.default = New;
