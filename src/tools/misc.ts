
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
  return prod;
}

export function setProd(): void {
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

export async function selectPnpm(version: string = "latest"): Promise<void> {
  await exec(`corepack prepare pnpm@${version} --activate`);
}

export async function installDependencies(): Promise<void> {
  if (isProd()) {
    await exec("pnpm install --frozen-lockfile");
  } else {
    await exec("pnpm install");
  }
}

export async function cleanWithGit(): Promise<void> {
  await exec("git clean -dfX");
}

export function setDisplayName<T extends TaskFunction>(name: string, task: T): T {
  task.displayName = name;
  return task;
}