
import { maxSatisfying } from "semver";
import { exec } from "./exec.js";
import { isProd } from "./misc.js";
import { getProjectPnpmVersion } from "./package.js";

/**
 * Install and activate pnpm using the version range specified by package.json engines.pnpm.
 * @public
 */
export async function selectPnpm(): Promise<void> {
  // Request all valid versions from pnpm
  const packageInfo = await (await fetch("https://registry.npmjs.org/@pnpm/exe")).json();
  if (typeof packageInfo !== "object" || packageInfo === null || !("versions" in packageInfo)) throw new Error("Could not read packageInfo.versions from https://registry.npmjs.org/@pnpm/exe");
  const versionObject = packageInfo.versions;
  if (typeof versionObject !== "object" || versionObject === null) throw new Error("Could not read packageInfo.versions from https://registry.npmjs.org/@pnpm/exe");
  const versions = Object.keys(versionObject);
  // get the version specified in package.json
  let targetVersion = await getProjectPnpmVersion();
  if (targetVersion === undefined) {
    targetVersion = "*";
  }
  // find the latest version satisfying the package.json range
  let version = maxSatisfying(versions, targetVersion);
  if (version === null) {
    version = "";
  }
  // install the selected version
  if (process.platform === "win32") {
    await exec({ env: { PNPM_VERSION: version }, shell: "powershell" })`iwr https://get.pnpm.io/install.ps1 -useb | iex`;
  } else {
    await exec({ env: { PNPM_VERSION: version }, shell: true })`wget -qO- https://get.pnpm.io/install.sh | sh -`;
  }
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