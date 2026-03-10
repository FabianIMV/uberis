export declare const MIN_XCODE_VERSION = "9.4.0";
export declare const APP_STORE_ID = "497799835";
export declare function getXcodeVersionAsync(): Promise<string | undefined>;
type XcodeBuildSettings = {
    action: string;
    buildSettings: {
        BUILD_DIR: string;
        CONFIGURATION_BUILD_DIR: string;
        EXECUTABLE_FOLDER_PATH: string;
        PRODUCT_BUNDLE_IDENTIFIER: string;
        TARGET_BUILD_DIR: string;
        UNLOCALIZED_RESOURCES_FOLDER_PATH: string;
    };
    target: string;
};
export declare function getXcodeBuildSettingsAsync(xcworkspacePath: string, scheme: string): Promise<XcodeBuildSettings[]>;
export declare function resolveXcodeProjectAsync(projectRoot: string): Promise<string | undefined>;
export declare function openAppStoreAsync(appId: string): Promise<void>;
export {};
