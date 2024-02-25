import { series, type TaskFunction } from "./gulp.js";
import { setDisplayName } from "./misc.js";

/**
 * Exists the gulp task after all tasks finished in series.
 * @param tasks - A list of task functions wich are executed in series.
 * @returns 
 * @public
 */
export function exitAfter(...tasks: TaskFunction[]): TaskFunction {
  return series(...tasks,
    setDisplayName("exit", async function _exit() {
      exit();
    })
  );
}

/**
 * Exit the current process asynchronously.
 * @param code - exit code to use (default = 0)
 * @public
 */
export function exit(code: number = 0): void {
  setTimeout(() => {
    process.exit(code);
  }, 50);
}