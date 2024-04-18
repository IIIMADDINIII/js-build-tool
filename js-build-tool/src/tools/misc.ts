

import * as timers from "timers/promises";
import type { TaskFunction } from "./gulp.js";

/**
 * Helper function to set the displayname of minified functions.
 * @param name - the name which should be applied to the task.
 * @param task - the task (async function) which should receive the label.
 * @returns the Taskfunktion with the displayName applied.
 * @public
 */
export function setDisplayName<T extends TaskFunction>(name: string, task: T): T {
  task.displayName = name;
  return task;
}

/**
 * Waits for the specified amount of milliseconds and then resolves the Promise.
 * @param time - time in milliseconds to wait (default = 0).
 * @public
 */
export function wait(time: number = 0): Promise<void> {
  return timers.setTimeout(time);
}

