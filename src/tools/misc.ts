

import { createRequire } from "module";
import * as path from "path";
import { exec } from "./exec.js";
import type { TaskFunction } from "./gulp.js";
import { dlxPath } from "./paths.js";

let prod = false;

/**
 * Returns if it was run in production mode.
 * @returns true when it is in production mode.
 * @public
 */
export function isProd(): boolean {
  let prodEnv = process.env["prod"];
  if (prodEnv === undefined) return prod;
  return prod || (prodEnv.trim().toLowerCase() == "true");
}

/**
 * Sets the environment to be Production.
 * All Tasks from now run in Production mode.
 * @public
 */
export function setProd(): void {
  process.env["prod"] = "true";
  prod = true;
}

/**
 * Clean the Project folder with git (git -c core.longpaths=true clean -dfX).
 * @public
 */
export async function cleanWithGit(): Promise<void> {
  await exec({ env: { GIT_ASK_YESNO: "false" } })`git -c core.longpaths=true clean -dfX`;
}

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
 * Adds an folder to the Path variable.
 * @param folder - the folder which should be added to the path (should be absolute).
 * @public
 */
export function addToPath(folder: string): void {
  process.env["path"] = folder + ";" + process.env["path"];
}

/**
 * Run the testfiles with jest.
 * @param testFiles - files wich should be executed as tests.
 * @public
 */
export async function runTestFiles(testFiles: string[]) {
  await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest ${testFiles.map((testFile) => testFile.replaceAll("\\", "/"))}`;
}

/**
 * Runs all testfiles from the jest config.
 * @public
 */
export async function runTests() {
  await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest`;
}

/**
 * Resolves the absolute filepath of a module.
 * @param module - name of the module to resolve.
 * @returns 
 * @public
 */
export function resolveModule(module: string): string {
  return createRequire(path.resolve(dlxPath, "package.json")).resolve(module);
}