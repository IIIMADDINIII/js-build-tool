import { exit } from "../tasks.js";
import { TaskFunction, series } from "./gulp.js";

export function exitAfter(...tasks: TaskFunction[]): TaskFunction {
  return series(...tasks, exit());
}