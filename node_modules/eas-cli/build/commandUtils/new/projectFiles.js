"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanAndPrefix = cleanAndPrefix;
exports.generateAppConfigAsync = generateAppConfigAsync;
exports.generateEasConfigAsync = generateEasConfigAsync;
exports.updatePackageJsonAsync = updatePackageJsonAsync;
exports.copyProjectTemplatesAsync = copyProjectTemplatesAsync;
exports.updateReadmeAsync = updateReadmeAsync;
const tslib_1 = require("tslib");
const eas_json_1 = require("@expo/eas-json");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const ts_deepmerge_1 = tslib_1.__importDefault(require("ts-deepmerge"));
const api_1 = require("../../api");
const easCli_1 = require("../../utils/easCli");
// Android package names must start with a lowercase letter
// schemes must start with a lowercase letter and can only contain lowercase letters, digits, "+", "." or "-"
function cleanAndPrefix(_string, type) {
    let string = _string;
    let pattern = /[^A-Za-z0-9]/g;
    if (type === 'scheme') {
        string = _string.toLowerCase();
        pattern = /[^a-z0-9+.-]/g;
    }
    const prefix = /^[^a-z]/.test(string) ? type : '';
    const cleaned = string.replaceAll(pattern, '');
    return prefix + cleaned;
}
async function generateAppConfigAsync(projectDir, app) {
    const user = cleanAndPrefix(app.ownerAccount.name, 'user');
    const slug = cleanAndPrefix(app.slug, 'app');
    const scheme = cleanAndPrefix(app.name ?? app.slug, 'scheme');
    const bundleIdentifier = `com.${user}.${slug}`;
    const updateUrl = (0, api_1.getEASUpdateURL)(app.id, /* manifestHostOverride */ null);
    const { expo: baseExpoConfig } = await fs_extra_1.default.readJson(path_1.default.join(projectDir, 'app.json'));
    const expoConfig = {
        name: app.name ?? app.slug,
        slug: app.slug,
        scheme,
        extra: {
            eas: {
                projectId: app.id,
            },
        },
        owner: app.ownerAccount.name,
        updates: {
            url: updateUrl,
        },
        runtimeVersion: {
            policy: 'appVersion',
        },
        ios: {
            bundleIdentifier,
        },
        android: {
            package: bundleIdentifier,
        },
    };
    const mergedConfig = (0, ts_deepmerge_1.default)(baseExpoConfig, expoConfig);
    const appJsonPath = path_1.default.join(projectDir, 'app.json');
    await fs_extra_1.default.writeJson(appJsonPath, { expo: mergedConfig }, { spaces: 2 });
}
async function generateEasConfigAsync(projectDir) {
    const easBuildGitHubConfig = {
        android: {
            image: 'latest',
        },
        ios: {
            image: 'latest',
        },
    };
    const easJson = {
        cli: {
            version: `>= ${easCli_1.easCliVersion}`,
            appVersionSource: eas_json_1.AppVersionSource.REMOTE,
        },
        build: {
            development: {
                developmentClient: true,
                distribution: 'internal',
                ...easBuildGitHubConfig,
            },
            'development-simulator': {
                extends: 'development',
                ios: {
                    simulator: true,
                },
            },
            preview: {
                distribution: 'internal',
                channel: 'main',
                ...easBuildGitHubConfig,
            },
            production: {
                channel: 'production',
                autoIncrement: true,
                ...easBuildGitHubConfig,
            },
        },
        submit: {
            production: {},
        },
    };
    const easJsonPath = path_1.default.join(projectDir, 'eas.json');
    await fs_extra_1.default.writeJson(easJsonPath, easJson, { spaces: 2 });
}
async function updatePackageJsonAsync(projectDir) {
    const packageJsonPath = path_1.default.join(projectDir, 'package.json');
    const packageJson = await fs_extra_1.default.readJson(packageJsonPath);
    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }
    packageJson.scripts.draft = 'npx eas-cli@latest workflow:run create-draft.yml';
    packageJson.scripts['development-builds'] =
        'npx eas-cli@latest workflow:run create-development-builds.yml';
    packageJson.scripts.deploy = 'npx eas-cli@latest workflow:run deploy-to-production.yml';
    await fs_extra_1.default.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}
async function copyProjectTemplatesAsync(projectDir) {
    const templatesSourceDir = path_1.default.join(__dirname, 'templates');
    // Copy everything from templates to projectDir, skipping readme-additions.md
    await fs_extra_1.default.copy(templatesSourceDir, projectDir, {
        overwrite: true,
        errorOnExist: false,
        filter: (src) => {
            return !src.endsWith('readme-additions.md');
        },
    });
}
async function updateReadmeAsync(projectDir, packageManager) {
    const readmeTemplatePath = path_1.default.join(__dirname, 'templates', 'readme-additions.md');
    const projectReadmePath = path_1.default.join(projectDir, 'README.md');
    const readmeAdditions = await fs_extra_1.default.readFile(readmeTemplatePath, 'utf8');
    const existingReadme = await fs_extra_1.default.readFile(projectReadmePath, 'utf8');
    const targetSection = '## Get started';
    const sectionIndex = existingReadme.indexOf(targetSection);
    let mergedReadme;
    if (sectionIndex !== -1) {
        // Find the next ## section after "## Get started"
        const afterTargetSection = existingReadme.substring(sectionIndex);
        const nextSectionMatch = afterTargetSection.match(/\n## /);
        let endIndex = existingReadme.length;
        if (nextSectionMatch?.index !== undefined) {
            // Replace from "## Get started" to the next "##" section
            endIndex = sectionIndex + nextSectionMatch.index;
        }
        const beforeSection = existingReadme.substring(0, sectionIndex).trim();
        const afterSection = existingReadme.substring(endIndex);
        mergedReadme = beforeSection + '\n\n' + readmeAdditions.trim() + '\n\n' + afterSection;
    }
    else {
        // No "Get started" section found, append the template to the existing README
        mergedReadme = existingReadme.trim() + '\n\n' + readmeAdditions.trim();
    }
    mergedReadme = mergedReadme.replaceAll('npm run', `${packageManager} run`);
    await fs_extra_1.default.writeFile(projectReadmePath, mergedReadme);
}
