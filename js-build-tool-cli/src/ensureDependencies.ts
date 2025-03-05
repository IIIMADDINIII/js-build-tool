import install from "#install";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { lock } from "proper-lockfile";
import { setTimeout } from "timers/promises";
import { pnpmInstall } from "./pnpmInstall.js";

/**
 * Makes sure that the dependencies are installed.
 * Either because they are already installed or they get installed.
 * @returns the path of the Dependency directory.
 */
export async function ensureDependencies(): Promise<string> {
  const ownVersion = await getOwnVersion();
  const dependenciesDir = await getDependenciesDir(ownVersion || "0.0.0");
  const doneFile = resolve(dependenciesDir, "done");
  const busyFile = resolve(dependenciesDir, "busy");
  let retryCount = 0;
  while (retryCount < 60) {
    // Check if the Done File exists
    try {
      await stat(doneFile);
      // Is so no installation necessary
      if (retryCount !== 0) process.stdout.write("\n");
      process.stdout.write(`Dependencies already installed in ${dependenciesDir}\n`);
      return dependenciesDir;
    } catch (e) {
      if ((typeof e !== "object") || (e === null) || !("code" in e) || (e.code !== "ENOENT")) throw e;
    }
    // done File does not exist so create the Busy file when not already existing
    try {
      const release = await lock(busyFile, { realpath: false });
      try {
        if (retryCount !== 0) process.stdout.write("\n");
        process.stdout.write(`Preparing Dependencies in ${dependenciesDir}\n`);
        (install.dependencies as { [dep: string]: string; })["@iiimaddiniii/js-build-tool"] = ownVersion || ">=0";
        await pnpmInstall(dependenciesDir, install);
        try {
          await writeFile(doneFile, "");
        } finally {
          return dependenciesDir;
        }
      } finally {
        await release();
      }
    } catch (e) {
      if ((typeof e !== "object") || (e === null) || !("code" in e) || (e.code !== "ELOCKED")) throw e;
      // Busy File exists so redo the check until done file exists ore busy file is gone
      if (retryCount === 0) process.stdout.write(`Rechecking every second: Busy installing Dependencies ${dependenciesDir}\n`);
      process.stdout.write(".");
      retryCount++;
      await setTimeout(1000);
      continue;
    }
  }
  // max Retry's reached causes an error
  process.stdout.write("\n");
  throw new Error(`Could not install dependencies: If you are sure that no js-build-tool instances are running manually delete the file ${busyFile}`);
}

/**
 * Generates a folder based on appData folder (or temp dir if not found) and version.
 * @returns the path where the dependencies should be installed.
 */
async function getDependenciesDir(ownVersion: string): Promise<string> {
  let appDataFolder = getAppDataDir();
  let isTemp = false;
  if (appDataFolder === undefined) {
    isTemp = true;
    appDataFolder = tmpdir();
  }
  let dependenciesDir = resolve(appDataFolder, "js-build-tool", ownVersion);
  if (isTemp) dependenciesDir = resolve(dependenciesDir, (Math.random() * 999999999).toFixed(0));
  await mkdir(dependenciesDir, { recursive: true });
  return dependenciesDir;
}

/**
 * Return the AppData location for each platform.
 * @returns the path to the AppData Folder.
 */
function getAppDataDir(): string | undefined {
  switch (process.platform) {
    case "darwin":
      return process.env["HOME"] ? join(process.env["HOME"], "Library", "Application Support") : undefined;
    case "linux":
      return process.env["HOME"] ? join(process.env["HOME"], ".local", "share") : undefined;
    case "win32":
      return process.env["APPDATA"] ? join(process.env["APPDATA"], "..", "Local") : undefined;
    case "cygwin":
    case "netbsd":
    case "aix":
    case "android":
    case "freebsd":
    case "haiku":
    case "openbsd":
    case "sunos":
      throw new Error(`${process.platform} is not supported.`);
  }
}

/**
 * Read the own Version from the Package.json file.
 * @returns version string.
 */
async function getOwnVersion(): Promise<string | undefined> {
  try {
    const p = <unknown>JSON.parse(await readFile(resolve(__dirname, "../package.json"), { encoding: "utf8" }));
    if (typeof p !== "object" || p === null || !("version" in p)) return undefined;
    const version = p.version;
    if (typeof version !== "string") return undefined;
    return version;
  } catch {
    return undefined;
  }
}