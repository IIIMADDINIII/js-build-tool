import { copyFile, mkdir, stat } from "fs/promises";
import gulp from "gulp";
import { dirname, resolve } from "path";
import { exec, prefixTaskOutput } from "./exec.js";
import { file } from "./file.js";
import { addToPath, buildDir } from "./paths.js";
import { pnpmInstall, runForDependencies, type GlopPatternObject } from "./pnpm.js";

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

/**
 * Return type of startTask.
 * @public
 */
export type Task = {
  name: string;
  time: [number, number];
};

/**
 * Prints to the console like a task starts.
 * @param name - name of the Task to show.
 * @returns a Task definition.
 * @public
 */
export function startTask(name: string): Task {
  gulp.emit('start', {
    name,
    branch: false,
    time: Date.now(),
  });
  return { name, time: process.hrtime() };
}

/**
 * Prints to the console like a task errors.
 * @param task - Task creates with startTask.
 * @param error - Error to show.
 * @public
 */
export function errorTask(task: Task, error: unknown) {
  gulp.emit('error', {
    name: task.name,
    branch: false,
    error,
    duration: process.hrtime(task.time),
    time: Date.now(),
  });
}

/**
 * Prints to the console like a task finishes.
 * @param task - Task creates with startTask.
 * @public
 */
export function endTask(task: Task) {
  gulp.emit('stop', {
    name: task.name,
    branch: false,
    duration: process.hrtime(task.time),
    time: Date.now(),
  });
}

/**
 * Prints to the console like a task.
 * @param name - name of the Task to show. 
 * @param fn - Function to call.
 * @public
 */
export async function taskFunction(name: string, fn: () => Promise<void>): Promise<void> {
  const task = startTask(name);
  try {
    await fn();
    endTask(task);
  } catch (e) {
    errorTask(task, e);
    throw e;
  }
}

/**
 * Counter for sub scripts to run to create temp folders.
 */
let gulpScriptCounter: number = 0;

/**
 * Calculates a temporary folder wich is unused.
 * @returns the Path where to put the temporary data.
 */
function getTempDir(): string {
  gulpScriptCounter += 1;
  const tempDir = resolve(buildDir, "run" + gulpScriptCounter);
  return tempDir;
}

/**
 * Calculates and copies the GulpFile to the tempDir.
 * @param gulpScript - the script to run. Can be a folder, then "gulpfile.mjs" is used as the file.
 * @param tempDir - tempDir wich gets used.
 * @returns gulpfile location and cwd for gulp task.
 */
async function resolveGulpFile(gulpScript: string, tempDir: string): Promise<{ gulpFilePath: string; cwd: string; }> {
  gulpScript = file(gulpScript);
  let cwd = gulpScript;
  if ((await stat(gulpScript)).isDirectory()) {
    gulpScript = resolve(gulpScript, "gulpfile.mjs");
  } else {
    cwd = dirname(gulpScript);
  }
  const gulpFilePath = resolve(tempDir, "gulpfile.mjs");
  await mkdir(tempDir);
  await copyFile(gulpScript, gulpFilePath);
  return { gulpFilePath, cwd };
}

/**
 * calculates the Display Name and prefix for a gulp script.
 * @param gulpScript - the script to run. Can be a folder, then "gulpfile.mjs" is used as the file.
 * @param tasks - args to send to the gulp process (default = []).
 * @param label - prefix for the cli output (default = gulpScript + arg[0]).
 * @returns name and prefix to show.
 */
function getDisplayName(gulpScript: string, tasks: string[] = [], label?: string | undefined): { name: string; prefix: string; } {
  let name = label;
  if (name === undefined) {
    name = gulpScript;
    if (name === "") name = ".";
    if (tasks[0] !== undefined) name = name + " " + tasks[0];
  }
  const prefix = "[" + name + "]: ";
  return { name, prefix };
}

/**
 * Calculates if a task in tasks is missing.
 * @param gulpFilePath - path to the local temporary gulpfile.
 * @param cwd - original folder of the gulpfile.
 * @param tasks - args to send to the gulp process (default = []).
 * @returns 
 */
async function isMissingTask(gulpFilePath: string, cwd: string, tasks: string[]): Promise<boolean> {
  const result = await exec({ stdio: "pipe", env: { GULP_FILE: gulpFilePath }, verbose: false, preferLocal: false })`gulp -f ${gulpFilePath} --cwd ${cwd} --tasks-json --depth 0`;
  const data = <unknown>JSON.parse(result.stdout);
  if (typeof data !== "object" || data === null || !("nodes" in data)) throw new Error("Could not retrieve available tasks");
  const nodes = data.nodes;
  if (!Array.isArray(nodes)) throw new Error("Could not retrieve available tasks");
  const validTasks = (nodes as unknown[]).map((task) => {
    if (typeof task !== "object" || task === null || !("label" in task) || typeof task.label !== "string") throw new Error("Could not retrieve available tasks");
    return task.label;
  });
  if (tasks.length === 0) tasks = ["default"];
  return tasks.some((task) => {
    if (task.startsWith("-")) return false;
    return !validTasks.includes(task);
  });
}

/**
 * Runs a Gulp Script in a temporary folder.
 * @param gulpScript - the script to run. Can be a folder, then "gulpfile.mjs" is used as the file.
 * @param tasks - args to send to the gulp process (default = []).
 * @param label - prefix for the cli output (default = gulpScript + arg[0]).
 * @param dependencies - object, listing additional dependencies wich to install.
 * @param ignoreTaskMissing - ignores if the Task is missing (default = false).
 * @public
 */
export async function runGulpScript(gulpScript: string, tasks: string[] | string = [], label?: string | undefined, dependencies?: { [key: string]: string; } | undefined, ignoreTaskMissing: boolean = false): Promise<void> {
  if (typeof tasks === "string") tasks = [tasks];
  const { name, prefix } = getDisplayName(gulpScript, tasks, label);
  const tempDir = getTempDir();
  const { gulpFilePath, cwd } = await resolveGulpFile(gulpScript, tempDir);
  if (ignoreTaskMissing) {
    if (await isMissingTask(gulpFilePath, cwd, tasks)) return;
  }
  async function run() {
    if (dependencies !== undefined) {
      await pnpmInstall(tempDir, dependencies);
      addToPath(resolve(tempDir, "node_modules", ".bin"));
    }
    try {
      const task = exec({ stdio: ["inherit", "pipe", "pipe"], reject: false, env: { GULP_FILE: gulpFilePath }, verbose: false, preferLocal: false })`gulp -f ${gulpFilePath} --cwd ${cwd} ${tasks}`;
      await prefixTaskOutput(task, prefix);
      const result = await task;
      if (result.exitCode !== 0) throw new Error(`Script exited with code: ${result.exitCode}`);
    } catch (e) {
      if ((typeof e !== "object") || (e === null) || !("exitCode" in e) || (typeof e.exitCode !== "number")) throw e;
      if (e.exitCode !== 0) throw new Error(`Script exited with code: ${e.exitCode}`);
    }
  }
  return taskFunction("runGulpScript " + name, run);
}

/**
 * Mapping glob patterns to args to run.
 * @public
 */
export type PackagesScripts = { [globPattern: string]: string[] | string; };

/**
 * Executes scripts in local packages matching the glob pattern.
 * @param globPattern - object with glob patterns as keys and the args for the matching scripts as values.
 * @param respectLocalDependencies - only start functions for Packages, when dependencies finished (default = true).
 * @param ignoreCurrentGulpFile - do not execute in the current package (default = true).
 * @param ignoreTaskMissing - ignores if the Task is missing (default = true).
 * @public
 */
export async function runScriptsInPackages(globPattern: PackagesScripts, respectLocalDependencies: boolean = true, ignoreCurrentGulpFile: boolean = true, ignoreTaskMissing: boolean = true): Promise<void> {
  const globPatternObject: GlopPatternObject = Object.fromEntries(Object.entries(globPattern)
    .map(([key, args]) => ([key, (relPath) => {
      return runGulpScript(relPath, args, undefined, undefined, ignoreTaskMissing);
    }]))
  );
  await runForDependencies(globPatternObject, respectLocalDependencies, ignoreCurrentGulpFile);
}