import { api, type MakeOptions, type PackageOptions, type StartOptions } from "@electron-forge/core";
import { type ForgeConfig } from "@electron-forge/shared-types";
import fs from "fs-extra";
import * as module from "module";
import path from "path";
import { exec } from "../tools/exec.js";
import { downloadGithubRelease, downloadLatestGithubRelease, type ReleaseAsset } from "../tools/github.js";
import { addToPath } from "../tools/misc.js";
import { dlxPath } from "../tools/paths.js";


// ToDo: Remove these helpers as soon it is possible to provide a config through the api
declare module "module" {
  export const _cache: { [key: string]: unknown; };
  export const _pathCache: { [key: string]: string; };
}

const configMap: Map<string, ForgeConfig> = new Map();
function pathExists(path: string): Promise<boolean>;
function pathExists(path: string, callback: (err: NodeJS.ErrnoException | null, exists: boolean) => void): void;
function pathExists(path: string, callback?: (err: NodeJS.ErrnoException | null, exists: boolean) => void): Promise<boolean> | void {
  if (configMap.has(path)) return Promise.resolve(true);
  if (callback === undefined) return origExists(path);
  return origExists(path, callback);
};
const origExists = fs.pathExists;
fs.pathExists = pathExists;

function registerForgeConfigForDirectory(dir: string = process.cwd(), config: ForgeConfig | undefined | null) {
  const resolved = path.resolve(dir, "forge.config.js");
  if (config === undefined || config === null) {
    configMap.delete(resolved);
    delete module._cache[resolved];
    delete module._pathCache[resolved + "\x00"];
    return;
  }
  configMap.set(resolved, config);
  module._cache[resolved] = { exports: config };
  module._pathCache[resolved + "\x00"] = resolved;
}

/**
 * Package the electron app using electron forge.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.PackageOptions.html) for the package Command (default = {}).
 * @public
 */
export async function pack(options: PackageOptions = {}, config: ForgeConfig): Promise<void> {
  registerForgeConfigForDirectory(options.dir, config);
  await api.package(options);
  registerForgeConfigForDirectory(options.dir, null);
}

/**
 * Makes the electron app using electron forge.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.MakeOptions.html) for the make Command (default = {}).
 * @public
 */
export async function make(options: MakeOptions = {}, config: ForgeConfig): Promise<void> {
  registerForgeConfigForDirectory(options.dir, config);
  await api.make(options);
  registerForgeConfigForDirectory(options.dir, null);
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @public
 */
export async function publish(options: StartOptions = {}, config: ForgeConfig): Promise<void> {
  registerForgeConfigForDirectory(options.dir, config);
  await api.publish(options);
  registerForgeConfigForDirectory(options.dir, null);
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @public
 */
export async function start(options: StartOptions = {}, config: ForgeConfig): Promise<void> {
  registerForgeConfigForDirectory(options.dir, config);
  await api.start(options);
  registerForgeConfigForDirectory(options.dir, null);
}

export async function startLegacy() {
  await exec`electron .`;
}



function getWixAsset(_version: string, assets: ReleaseAsset[]): ReleaseAsset | undefined {
  return assets.find((asset) => asset.name.endsWith("-binaries.zip"));
}

/**
 * Downloads the wixtoolset automatically and adds it to the path, so Electron Forge can use it.
 * @param releaseTag - wich release of the wixtoolset should be downloaded (undefined = latest).
 * @public
 */
export async function prepareWixTools(releaseTag?: string) {
  const dlDir = path.resolve(dlxPath, "download");
  const wixDir = path.resolve(dlDir, "wix3");
  if (typeof releaseTag == "string") {
    await downloadGithubRelease({ owner: "wixtoolset", repo: "wix3", destination: wixDir, getAsset: getWixAsset, tag: releaseTag, shouldExtract: true });
  } else {
    await downloadLatestGithubRelease({ owner: "wixtoolset", repo: "wix3", destination: wixDir, getAsset: getWixAsset, shouldExtract: true });
  }
  addToPath(wixDir);
}