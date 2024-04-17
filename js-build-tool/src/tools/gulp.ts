import gulp from "gulp";

/**
 * Takes a variable amount of strings (taskName) and/or functions (fn)
 * and returns a function of the composed tasks or functions.
 * Any taskNames are retrieved from the registry using the get method.
 *
 * When the returned function is executed, the tasks or functions will be executed in series,
 * each waiting for the prior to finish. If an error occurs, execution will stop.
 * @param tasks - List of tasks.
 * @public
 */
export const series: typeof import("gulp").series = gulp.series;

/**
 * Takes a variable amount of strings (taskName) and/or functions (fn)
 * and returns a function of the composed tasks or functions.
 * Any taskNames are retrieved from the registry using the get method.
 *
 * When the returned function is executed, the tasks or functions will be executed in parallel,
 * all being executed at the same time. If an error occurs, all execution will complete.
 * @param tasks - list of tasks.
 * @public
 */
export const parallel: typeof import("gulp").parallel = gulp.parallel;

/**
 * Type representing a Gulp Task.
 * @public
 */
export type TaskFunction = import("gulp").TaskFunction;