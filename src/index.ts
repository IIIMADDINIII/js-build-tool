import { exec } from "@iiimaddiniii/js-build-tool/execa";
import { series } from "@iiimaddiniii/js-build-tool/gulp";
import type { TaskFunction } from "gulp";
import * as path from "path";

let prod = false;
export const cwd = process.cwd();
export const packageDir = cwd;

export function file(relPath: string): string {
  return path.resolve(packageDir, relPath);
}

export function isProd(): boolean {
  return prod;
}

export async function setProd(): Promise<void> {
  prod = true;
}

export function selectPnpm(version: string = "latest"): () => Promise<void> {
  return async function selectPnpm() {
    await exec(`corepack prepare pnpm@${version} --activate`);
  };
}

export async function installDependencies(): Promise<void> {
  if (isProd()) {
    await exec("pnpm install --frozen-lockfile");
  } else {
    await exec("pnpm install");
  }
}

export function selectPnpmAndInstall(version: string = "latest"): TaskFunction {
  return series(setProd, selectPnpm(version), installDependencies);
}

export function prodSelectPnpmAndInstall(version: string = "latest"): TaskFunction {
  return series(setProd, selectPnpm(version), installDependencies);
}

export async function cleanWithGit(): Promise<void> {
  await exec("git clean -dfX");
}