
import * as misc from "./tools/misc.js";
import { TaskFunction, series, setDisplayName } from "./tools/misc.js";
import * as pnpm from "./tools/pnpm.js";

export * as electron from "./electron/tasks.js";
export * as rollup from "./rollup/tasks.js";


export function setProd(): () => Promise<void> {
  return setDisplayName("setProd", async function setProd() {
    misc.setProd();
  });
}

export function selectPnpm(version: string = "latest"): () => Promise<void> {
  return setDisplayName("selectPnpm", async function selectPnpm() {
    await pnpm.selectPnpm(version);
  });
}

export function installDependencies(): () => Promise<void> {
  return setDisplayName("installDependencies", async function installDependencies() {
    await pnpm.installDependencies();
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
    await misc.cleanWithGit();
  });
}

export function runScript(script: string, args: string[] = []): () => Promise<void> {
  return setDisplayName("runScript", async function runScript() {
    pnpm.runScript(script, args);
  });
}

export function runWorkspaceScript(script: string, filter: string = "*", args: string[] = []): () => Promise<void> {
  return setDisplayName("runWorkspaceScript", async function runWorkspaceScript() {
    await pnpm.runWorkspaceScript(script, filter, args);
  });
}

export function runWorkspaceScriptParallel(script: string, filter: string = "*", args: string[] = []): () => Promise<void> {
  return setDisplayName("runWorkspaceScriptParallel", async function runWorkspaceScriptParallel() {
    await pnpm.runWorkspaceScriptParallel(script, filter, args);
  });
}

export function exit(): () => Promise<void> {
  return setDisplayName("exit", async function exit() {
    setTimeout(() => {
      process.exit();
    }, 50);
  });
}
