
import * as fs from "fs/promises";
import gulp, { TaskFunction } from "gulp";
import { exec } from "gulp-execa";
import * as path from "path";

export const series: typeof gulp.series = gulp.series;
export const parallel: typeof gulp.parallel = gulp.parallel;
export type { TaskFunction } from "gulp";


let prod = false;
export const cwd = process.cwd();
export const packageDir = cwd;

export function isProd(): boolean {
  let prodEnv = process.env["prod"];
  if (prodEnv === undefined) return prod;
  return prod || (prodEnv.trim().toLowerCase() == "true");
}

export function setProd(): void {
  process.env["prod"] = "true";
  prod = true;
}

export function file(relPath: string): string {
  return path.resolve(packageDir, relPath);
}

export async function read(relPath: string): Promise<string> {
  return fs.readFile(file(relPath), { encoding: "utf-8" });
}

export async function readJson(relPath: string): Promise<any> {
  return JSON.parse(await read(relPath));
}

export async function cleanWithGit(): Promise<void> {
  await exec("git clean -dfX");
}

export function setDisplayName<T extends TaskFunction>(name: string, task: T): T {
  task.displayName = name;
  return task;
}