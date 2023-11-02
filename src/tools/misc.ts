

import { createRequire } from "module";
import * as path from "path";
import { exec } from "./exec.js";
import type { TaskFunction } from "./gulp.js";
import { dlxPath } from "./paths.js";

let prod = false;

export function isProd(): boolean {
  let prodEnv = process.env["prod"];
  if (prodEnv === undefined) return prod;
  return prod || (prodEnv.trim().toLowerCase() == "true");
}

export function setProd(): void {
  process.env["prod"] = "true";
  prod = true;
}

export async function cleanWithGit(): Promise<void> {
  await exec`git -c core.longpaths=true clean -dfX`;
}

export function setDisplayName<T extends TaskFunction>(name: string, task: T): T {
  task.displayName = name;
  return task;
}

export function addToPath(folder: string): void {
  process.env["path"] = folder + ";" + process.env["path"];
}

export async function runTestFiles(testFiles: string[]) {
  await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest ${testFiles.map((testFile) => testFile.replaceAll("\\", "/"))}`;
}

export async function runTests() {
  await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest`;
}

export function resolveModule(module: string): string {
  return createRequire(path.resolve(dlxPath, "package.json")).resolve(module);
}