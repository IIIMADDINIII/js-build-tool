// Seems to fix some Typescript fileWatcher Leaks
Error.stackTraceLimit = 10;


export * as rollup from "./rollup/index.js";
export * as tasks from "./tasks.js";
export * as tools from "./tools.js";

