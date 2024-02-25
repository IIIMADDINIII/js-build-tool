import { api, type MakeOptions, type PackageOptions, type StartOptions } from "@electron-forge/core";
import path from "path";
import { downloadGithubRelease, downloadLatestGithubRelease, type ReleaseAsset } from "../tools/github.js";
import { addToPath } from "../tools/misc.js";
import { dlxPath } from "../tools/paths.js";

/**
 * Package the electron app using electron forge.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.PackageOptions.html) for the package Command (default = {}).
 * @public
 */
export async function pack(options: PackageOptions = {}): Promise<void> {
  await api.package(options);
}

/**
 * Makes the electron app using electron forge.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.MakeOptions.html) for the make Command (default = {}).
 * @public
 */
export async function make(options: MakeOptions = {}): Promise<void> {
  await api.make(options);
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @public
 */
export async function publish(options: StartOptions = {}): Promise<void> {
  await api.publish(options);
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @public
 */
export async function start(options: StartOptions = {}): Promise<void> {
  await api.start(options);
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