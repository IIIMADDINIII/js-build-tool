
import { exec } from "gulp-execa";
import { isProd, series, setProd as setProduction, type TaskFunction } from "./tools.js";

export async function setProd(): Promise<void> {
  setProduction();
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

export * as rollup from "./rollup/tasks.js";

