
import { exec } from "./exec.js";
import { isProd } from "./misc.js";

/**
 * Install and activate PNPM.
 * @param version  - the version of pnpm to install (default = latest).
 * @public
 */
export async function selectPnpm(version: string = "latest"): Promise<void> {
  await exec`corepack prepare pnpm@${version} --activate`;
}

/**
 * Installs all dependencies of the package using pnpm.
 * Will use the frozen lockfile in Production mode.
 * @public
 */
export async function installDependencies(): Promise<void> {
  if (isProd()) {
    await exec`pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
  } else {
    await exec`pnpm install --config.confirmModulesPurge=false`;
  }
}

/**
 * Runs a pnpm script defined in the package.json file.
 * @param script - the name of the script to run.
 * @param args - an Array of arguments for the script (default = []).
 * @public
 */
export async function runScript(script: string, args: string[] = []): Promise<void> {
  await exec`pnpm run ${script} ${args}`;
}

/**
 * Runs a script in one specific or all workspaces.
 * @param script - the name of the script to run.
 * @param filter - a pnpm filter to specify in which workspaces to run the script (default = "*").
 * @param args - an Array of arguments for the script (default = []).
 * @public
 */
export async function runWorkspaceScript(script: string, filter: string = "*", args: string[] = []): Promise<void> {
  await exec`pnpm run --filter=${filter} --reporter=append-only --aggregate-output ${script} ${args}`;
}

/**
 * Runs a script in one specific or all workspaces in parallel.
 * @param script - the name of the script to run.
 * @param filter - a pnpm filter to specify in which workspaces to run the script (default = "*").
 * @param args - an Array of arguments for the script (default = []).
 * @public
 */
export async function runWorkspaceScriptParallel(script: string, filter: string = "*", args: string[] = []): Promise<void> {
  await exec`pnpm run --filter=${filter} --parallel --reporter=append-only --aggregate-output ${script} ${args}`;
}