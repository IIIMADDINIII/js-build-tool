
import { exec } from "./exec.js";
import { readYaml } from "./file.js";
import { getNodeVersionToUse } from "./package.js";
import { isProd } from "./prod.js";

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

/**
 * Returns a list of Workspace Packages defined in pnpm-workspace.yaml.
 * @public
 */
export async function getPnpmPackages(): Promise<string[] | undefined> {
  try {
    return (await readYaml("./pnpm-workspace.yaml"))?.packages;
  } catch {
    return undefined;
  }
}

/**
 * Option for incrementVersion on how to increment the Version String.
 * Same as [pnpm version ***](https://docs.npmjs.com/cli/v8/commands/npm-version)
 * @default "patch"
 * @public
 */
export type CountVersionOption = "patch" | "minor" | "major" | "prepatch" | "preminor" | "premajor" | "prerelease";

/**
 * Installs all dependencies of the package using pnpm.
 * Will use the frozen lockfile in Production mode.
 * @param majorMinorPatch - how to increment the version string (same as [pnpm version ***](https://docs.npmjs.com/cli/v8/commands/npm-version)) (default = "patch").
 * @public
 */
export async function incrementVersion(semverInc: CountVersionOption = "patch"): Promise<void> {
  await exec`pnpm version ${semverInc}`;
}

/**
 * Publishes the Package using pnpm publish command.
 * @public
 */
export async function publishPackage(): Promise<void> {
  await exec`pnpm publish`;
}

/**
 * Update all the dependencies with pnpm update.
 * @public
 */
export async function updatePackages(): Promise<void> {
  await exec`pnpm update`;
}