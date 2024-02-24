import { exit } from "../tasks.js";
import { series, type TaskFunction } from "./gulp.js";

/**
 * Exists the gulp task after all tasks finished in series.
 * @param tasks - A list of task functions wich are executed in series.
 * @returns 
 * @public
 */
export function exitAfter(...tasks: TaskFunction[]): TaskFunction {
  return series(...tasks, exit());
}