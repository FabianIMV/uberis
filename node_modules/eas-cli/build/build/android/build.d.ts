import { Platform } from '@expo/eas-build-job';
import { BuildRequestSender } from '../build';
import { AndroidBuildContext, BuildContext, CommonContext } from '../context';
export declare function createAndroidContextAsync(ctx: CommonContext<Platform.ANDROID>): Promise<AndroidBuildContext>;
export declare function prepareAndroidBuildAsync(ctx: BuildContext<Platform.ANDROID>): Promise<BuildRequestSender>;
export declare function maybeWarnAboutNonStandardBuildType({ buildProfile, buildType, }: {
    buildProfile: Pick<CommonContext<Platform.ANDROID>['buildProfile'], 'gradleCommand'>;
    buildType: string;
}): void;
