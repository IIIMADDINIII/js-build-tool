
import { writeFile } from "fs/promises";
import { relative, resolve } from "path";
import { minimatch } from "../lateImports.js";
import { exec } from "./exec.js";
import { getNodeVersionToUse } from "./package.js";
import { projectPath } from "./paths.js";
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

/**
 * Description pf a Package with its dependencies.
 * @public
 */
export type PackagesDependenciesDescription = { fullPath: string; name: string | undefined; relPath: string; dependencies: string[]; };

/**
 * Return type of getPnpmPackagesWithLocalDependencies.
 * @public
 */
export type PackagesDependencies = Map<string, PackagesDependenciesDescription>;

function addDependencies(depend: unknown, dependencies: string[]) {
  if (typeof depend !== "object" || depend === null) throw new Error("Could not retrieve dependencies");
  for (const value of Object.values(depend) as unknown[]) {
    if (typeof value !== "object" || value === null || !("path" in value) || typeof value.path !== "string") throw new Error("Could not retrieve dependencies");
    dependencies.push(relative(projectPath, value.path).replaceAll("\\", "/"));
  }
}

/**
 * Returns a list of project Packages with dependencies in the following form:
 * {relPath: {relPath: string, fullPath: string; name: string; dependencies: string[];}}
 *  * relPath: Relative Path of the package normalized to "/".
 *  * fullPath: Full Path of the dependencies location.
 *  * name: Name of the Package from the package.json or undefined if not specified.
 *  * dependencies: list of local dependencies this package has. is a list of relPaths.
 * @returns a PackageDependencies object.
 * @public
 */
export async function getPnpmPackagesWithLocalDependencies(): Promise<PackagesDependencies> {
  const dependencies = <unknown>JSON.parse((await exec({ stdio: "pipe", verbose: false })`pnpm list -r --only-projects --json`).stdout);
  if (!Array.isArray(dependencies)) throw new Error("Could not retrieve dependencies");
  const ret: PackagesDependencies = new Map();
  for (const dep of dependencies as unknown[]) {
    if (typeof dep !== "object" || dep === null) throw new Error("Could not retrieve dependencies");
    if (!("path" in dep) || typeof dep.path !== "string") throw new Error("Could not retrieve dependencies");
    const fullPath = dep.path;
    let name = undefined;
    if ("name" in dep) {
      if (typeof dep.name !== "string") throw new Error("Could not retrieve dependencies");
      name = dep.name;
    }
    let relPath = relative(projectPath, fullPath).replaceAll("\\", "/");
    let dependencies: string[] = [];
    if ("dependencies" in dep) addDependencies(dep.dependencies, dependencies);
    if ("devDependencies" in dep) addDependencies(dep.devDependencies, dependencies);
    if ("optionalDependencies" in dep) addDependencies(dep.optionalDependencies, dependencies);
    ret.set(relPath, { relPath, fullPath, name, dependencies });
  }
  return ret;
}

/**
 * Returns a list of Workspace Packages defined in pnpm-workspace.yaml.
 * @public
 */
export async function getPnpmPackages(): Promise<string[] | undefined> {
  try {
    const pack = <unknown>JSON.parse((await exec({ stdio: "pipe", verbose: false })`pnpm list -r --json --depth -1`).stdout);
    if (!Array.isArray(pack)) throw new Error("Could not retrieve dependencies");
    return pack.map((pack) => relative(projectPath, pack));
  } catch {
    return undefined;
  }
}

/**
 * Object mapping glob patterns to async functions.
 * @public
 */
export type GlopPatternObject = { [globPattern: string]: (relPath: string) => Promise<unknown>; };

/**
 * Run a Function for each workspace Package (including root).
 * The function to run can be specified with a globPattern.
 * GlobPattern is matched against relative path of the Package with a "/" appended.
 * If multiple pattern match, each function is run parallel.
 * If a package has a local dependency, it is delayed until the dependencies run successfully (or respectLocalDependencies is set to false).
 * @param globPatternObject - object mapping from a glob pattern to the function to run.
 * @param respectLocalDependencies - only start functions for Packages, when dependencies finished (default = true).
 * @param ignoreCurrentGulpFile - do not execute in the current package (default = true).
 * @public
 */
export async function runForDependencies(globPatternObject: GlopPatternObject, respectLocalDependencies: boolean = true, ignoreCurrentGulpFile: boolean = true): Promise<void> {
  const localPackages = await getPnpmPackagesWithLocalDependencies();
  const promiseCache: Map<PackagesDependenciesDescription, () => Promise<void>> = new Map();
  const Minimatch = (await minimatch()).Minimatch;
  const patterns = new Map(Object.entries(globPatternObject).map(([pattern, fn]) => [new Minimatch(pattern), fn]));
  function runTask(pack: PackagesDependenciesDescription): Promise<void> {
    if (!respectLocalDependencies) return getPatternRunner(pack.relPath, patterns, ignoreCurrentGulpFile)();
    const cache = promiseCache.get(pack);
    if (cache !== undefined) return cache();
    promiseCache.set(pack, () => Promise.reject("Cyclic Dependencies are not supported."));
    let deps: Promise<unknown> = Promise.resolve();
    if (pack.dependencies !== undefined && pack.dependencies.length > 0) {
      const dependencies = pack.dependencies.map((relPath) => {
        const dep = localPackages.get(relPath);
        if (dep === undefined) throw new Error(`Unknown Dependency: ${relPath}`);
        return runTask(dep);
      });
      deps = Promise.all(dependencies);
    }
    const promise = deps.then(getPatternRunner(pack.relPath, patterns, ignoreCurrentGulpFile));
    promiseCache.set(pack, () => promise);
    return promise;
  }
  await Promise.all([...localPackages.values()].map((val) => runTask(val)));
}

/**
 * Helper function to run all tasks for a relPath
 * @param relPath - the relative path to execute.
 * @param patterns - map of all Patterns to check against.
 * @param ignoreCurrentGulpFile - do not execute in the current package.
 */
function getPatternRunner(relPath: string, patterns: Map<import("minimatch").Minimatch, (relPath: string) => Promise<unknown>>, ignoreCurrentGulpFile: boolean): () => Promise<void> {
  if (relPath === "" && ignoreCurrentGulpFile) return () => Promise.resolve();
  const path = relPath + "/";
  const fns = [...patterns.entries()].filter(([minimatch, _]) => minimatch.match(path)).map(([_, fn]) => fn);
  return async function run(): Promise<void> {
    await Promise.all(fns.map((fn) => fn(relPath)));
  };
}

/**
 * Installs the dependencies listed in dependencies in the folder DependenciesDir.
 * @param dependenciesDir - Folder where to install the Dependencies.
 * @param dependencies - Dependencies to install.
 * @public
 */
export async function pnpmInstall(dependenciesDir: string, dependencies: { [key: string]: string; }): Promise<void> {
  await writeFile(resolve(dependenciesDir, "package.json"), JSON.stringify({ dependencies }));
  await exec({ cwd: dependenciesDir, })`pnpm install --config.confirmModulesPurge=false --config.package-import-method=copy`;
}