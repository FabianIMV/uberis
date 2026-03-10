import bunyan from 'bunyan';
import LoggerLevel from './level';
import { PipeMode, PipeOptions, pipe, pipeSpawnOutput } from './pipe';
declare function createLogger(options: bunyan.LoggerOptions): bunyan;
declare const defaultLogger: bunyan;
export default defaultLogger;
export { LoggerLevel, createLogger, pipe, pipeSpawnOutput, PipeMode, PipeOptions };
export type { bunyan };
