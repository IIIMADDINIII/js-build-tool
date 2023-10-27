
import { $ } from "execa";
import { fetchLatestRelease, fetchReleaseByTag } from "fetch-github-release";
import * as fs from "fs/promises";
import gulp, { TaskFunction } from "gulp";
import * as path from "path";
import * as url from 'url';

export const exec = $({ verbose: true, stdio: 'inherit' });

function findDlxPath(packagePath: string): string {
  return packagePath.slice(0, packagePath.indexOf("node_modules"));
}
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const dlxPath = findDlxPath(__dirname);
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
  await exec`git -c core.longpaths=true clean -dfX`;
}

export function setDisplayName<T extends TaskFunction>(name: string, task: T): T {
  task.displayName = name;
  return task;
}

export function addToPath(folder: string): void {
  process.env["path"] = folder + ";" + process.env["path"];
}

export async function downloadLatestGithubRelease(options: Parameters<typeof fetchLatestRelease>[0]) {
  await fetchLatestRelease(options);
}

export async function downloadGithubRelease(options: Parameters<typeof fetchReleaseByTag>[0]) {
  await fetchReleaseByTag(options);
}

export async function runTests(testFolder: string) {
  await exec`ava ${testFolder}/**`;
}

export async function runTestFiles(testFiles: string[]) {
  await exec`ava ${testFiles}`;
}