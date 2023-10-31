

import * as fs from "fs/promises";
import * as path from "path";
import * as url from 'url';
import { exec } from "./exec.js";
import type { TaskFunction } from "./gulp.js";


function findDlxPath(packagePath: string): string {
  return packagePath.slice(0, packagePath.indexOf("node_modules"));
}
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const dlxPath = findDlxPath(__dirname);


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

export async function runTestFiles(testFiles: string[]) {
  await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest ${testFiles.map((testFile) => testFile.replaceAll("\\", "/"))}`;
}

export async function runTests() {
  await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest`;
}