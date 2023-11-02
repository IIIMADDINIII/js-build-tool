
import type { IConfigFile } from "@microsoft/api-extractor";
import * as tools from "./tools.js";
import { series, type TaskFunction } from "./tools/gulp.js";
import { setDisplayName } from "./tools/misc.js";

import * as electron from "./electron/tasks.js";
import * as rollup from "./rollup/tasks.js";
export { electron, rollup };


export function setProd(): () => Promise<void> {
  return setDisplayName("setProd", async function setProd() {
    tools.setProd();
  });
}

export function selectPnpm(version: string = "latest"): () => Promise<void> {
  return setDisplayName("selectPnpm", async function selectPnpm() {
    await tools.selectPnpm(version);
  });
}

export function installDependencies(): () => Promise<void> {
  return setDisplayName("installDependencies", async function installDependencies() {
    await tools.installDependencies();
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
    await tools.cleanWithGit();
  });
}

export function runScript(script: string, args: string[] = []): () => Promise<void> {
  return setDisplayName("runScript", async function runScript() {
    tools.runScript(script, args);
  });
}

export function runWorkspaceScript(script: string, filter: string = "*", args: string[] = []): () => Promise<void> {
  return setDisplayName("runWorkspaceScript", async function runWorkspaceScript() {
    await tools.runWorkspaceScript(script, filter, args);
  });
}

export function runWorkspaceScriptParallel(script: string, filter: string = "*", args: string[] = []): () => Promise<void> {
  return setDisplayName("runWorkspaceScriptParallel", async function runWorkspaceScriptParallel() {
    await tools.runWorkspaceScriptParallel(script, filter, args);
  });
}

export function exit(): () => Promise<void> {
  return setDisplayName("exit", async function exit() {
    setTimeout(() => {
      process.exit();
    }, 50);
  });
}

export function runTestFiles(testFiles: string[]): () => Promise<void> {
  return setDisplayName("runTestFiles", async function runTestFiles() {
    await tools.runTestFiles(testFiles);
  });
}

export function runTests(): () => Promise<void> {
  return setDisplayName("runTests", async function runTests() {
    await tools.runTests();
  });
}

export function runApiExtrator(projectPackageJsonPath: string, configObject: IConfigFile): () => Promise<void> {
  return setDisplayName("runApiExtrator", async function runApiExtrator() {
    await tools.runApiExtrator(projectPackageJsonPath, configObject);
  });
}