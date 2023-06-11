import type { TaskFunction } from "gulp";
import gulp from "gulp";
import { exec } from "gulp-execa";
import * as path from "path";

export * from "./rollupTools.js";

const { series } = gulp;

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
setProd.displayName = "setProd";

export function selectPnpm(version: string = "latest"): () => Promise<void> {
  async function selectPnpm() {
    await exec(`corepack prepare pnpm@${version} --activate`);
  };
  selectPnpm.displayName = "selectPnpm";
  return selectPnpm;
}

export async function installDependencies(): Promise<void> {
  if (isProd()) {
    await exec("pnpm install --frozen-lockfile");
  } else {
    await exec("pnpm install");
  }
}
installDependencies.displayName = "installDependencies";

export function selectPnpmAndInstall(version: string = "latest"): TaskFunction {
  return series(selectPnpm(version), installDependencies);
}
selectPnpmAndInstall.displayName = "selectPnpmAndInstall";

export function prodSelectPnpmAndInstall(version: string = "latest"): TaskFunction {
  return series(setProd, selectPnpm(version), installDependencies);
}
prodSelectPnpmAndInstall.displayName = "prodSelectPnpmAndInstall";

export async function cleanWithGit(): Promise<void> {
  await exec("git clean -dfX");
}
cleanWithGit.displayName = "cleanWithGit";


