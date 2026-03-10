import { Platform } from '@expo/eas-build-job';
import { BuildProfile, ResourceClass } from '@expo/eas-json';
import { BuildResourceClass } from '../../graphql/generated';
export declare function resolveBuildResourceClass<T extends Platform>(profile: BuildProfile<T>, platform: Platform, resourceClassFlag?: ResourceClass): BuildResourceClass;
