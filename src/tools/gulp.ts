import gulp from "gulp";

export const series: typeof import("gulp").series = gulp.series;
export const parallel: typeof import("gulp").parallel = gulp.parallel;
export type TaskFunction = import("gulp").TaskFunction;