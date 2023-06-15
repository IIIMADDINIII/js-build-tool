import { exit } from "../tasks.js";
import { TaskFunction, series } from "./misc.js";

export function exitAfter(task: TaskFunction): TaskFunction {
  return series(task, exit());
}