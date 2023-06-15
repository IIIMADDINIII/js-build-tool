
import { series, setDisplayName, cleanWithGit as toolCleanWithGit, installDependencies as toolInstallDependencies, selectPnpm as toolSelectPnpm, setProd as toolSetProd, type TaskFunction } from "./tools.js";

export function setProd(): () => Promise<void> {
  return setDisplayName("setProd", async function setProd() {
    toolSetProd();
  });
}

export function selectPnpm(version: string = "latest"): () => Promise<void> {
  return setDisplayName("selectPnpm", async function selectPnpm() {
    await toolSelectPnpm(version);
  });
}

export function installDependencies(): () => Promise<void> {
  return setDisplayName("installDependencies", async function installDependencies() {
    await toolInstallDependencies();
  });
}

export function selectPnpmAndInstall(version: string = "latest"): TaskFunction {
  return setDisplayName("selectPnpmAndInstall", series(selectPnpm(version), installDependencies()));
}

export function prodSelectPnpmAndInstall(version: string = "latest"): TaskFunction {
  return setDisplayName("selectPnpmAndInstall", series(setProd(), selectPnpm(version), installDependencies()));
}

export function cleanWithGit(): () => Promise<void> {
  return setDisplayName("cleanWithGit", async function selectPnpm() {
    await toolCleanWithGit();
  });
}

export * as rollup from "./rollup/tasks.js";

