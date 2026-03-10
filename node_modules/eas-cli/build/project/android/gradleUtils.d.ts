interface GradleCommand {
    moduleName?: string;
    flavor?: string;
    buildType?: string;
}
interface Config {
    applicationId?: string;
    applicationIdSuffix?: string;
    versionCode?: string;
    versionName?: string;
}
interface AppBuildGradle {
    android?: {
        defaultConfig?: Config;
        /**
         * If defined as `flavorDimensions = ['dimension1', 'dimension2']`,
         * this will be an array of strings (`['dimension1', 'dimension2']`).
         *
         * If defined as `flavorDimensions "dimension1", "dimension2"`,
         * this will be a string (`"dimension1", "dimension2"`).
         */
        flavorDimensions?: string | string[];
        productFlavors?: Record<string, Config>;
    };
}
export declare const DEFAULT_MODULE_NAME = "app";
export declare function getAppBuildGradleAsync(projectDir: string): Promise<AppBuildGradle>;
export declare function resolveConfigValue(buildGradle: AppBuildGradle, field: keyof Config, flavor?: string): string | undefined;
/**
 * Extract module name, buildType, and flavor from the gradle command.
 *
 * @param cmd can be any valid string that can be added after `./gradlew` call
 * e.g.
 *   - :app:buildDebug
 *   - app:buildDebug
 *   - buildDebug
 *   - buildDebug --console verbose
 * @param buildGradle is used to verify correct casing of the first letter in
 * the flavor name
 **/
export declare function parseGradleCommand(cmd: string, buildGradle: AppBuildGradle): GradleCommand;
export {};
