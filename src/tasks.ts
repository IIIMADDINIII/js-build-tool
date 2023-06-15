
import * as tool from "./tools.js";
import { TaskFunction, series, setDisplayName } from "./tools.js";

export * as rollup from "./rollup/tasks.js";

export function setProd(): () => Promise<void> {
  return setDisplayName("setProd", async function setProd() {
    tool.setProd();
  });
}

export function selectPnpm(version: string = "latest"): () => Promise<void> {
  return setDisplayName("selectPnpm", async function selectPnpm() {
    await tool.selectPnpm(version);
  });
}

export function installDependencies(): () => Promise<void> {
  return setDisplayName("installDependencies", async function installDependencies() {
    await tool.installDependencies();
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
    await tool.cleanWithGit();
  });
}


export function runScript(script: string, args: string[] = []): () => Promise<void> {
  return setDisplayName("runScript", async function runScript() {
    tool.runScript(script, args);
  });
}

export function runWorkspaceScript(script: string, args: string[] = []): () => Promise<void> {
  return setDisplayName("runWorkspaceScript", async function runWorkspaceScript() {
    await tool.runWorkspaceScript(script, args);
  });
}

export function runWorkspaceScriptParallel(script: string, args: string[] = []): () => Promise<void> {
  return setDisplayName("runWorkspaceScriptParallel", async function runWorkspaceScriptParallel() {
    await tool.runWorkspaceScriptParallel(script, args);
  });
}



