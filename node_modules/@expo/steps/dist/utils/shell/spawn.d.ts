import { PipeMode, bunyan } from '@expo/logger';
import { SpawnOptions as SpawnOptionsOriginal, SpawnPromise, SpawnResult } from '@expo/spawn-async';
import { IOType } from 'child_process';
type SpawnOptions = Omit<SpawnOptionsOriginal, 'stdio' | 'ignoreStdio'> & {
    lineTransformer?: (line: string) => string | null;
    mode?: PipeMode;
} & ({
    logger: bunyan;
    stdio: 'pipe' | [IOType, 'pipe', 'pipe', ...IOType[]];
} | {
    logger?: never;
    stdio?: SpawnOptionsOriginal['stdio'];
});
export declare function spawnAsync(command: string, args: string[], allOptions?: SpawnOptions): SpawnPromise<SpawnResult>;
export {};
