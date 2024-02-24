
import { exec } from "./exec.js";
import { isProd } from "./misc.js";
import { getNodeVersionToUse } from "./package.js";

/**
 * Install and activate node using the version range specified by package.json engines.pnpm.
 * If no version is pacified lts is used.
 * @param version - version string to use (default = package.enginesToUse.node || "lts").
 * @public
 */
export async function selectNode(version?: string): Promise<void> {
  if (version === undefined) {
    version = await getNodeVersionToUse();
  }
  if (version === undefined) {
    version = "lts";
  }
  await exec`pnpm env use -g ${version}`;
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