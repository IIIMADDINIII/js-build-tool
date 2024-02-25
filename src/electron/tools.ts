// import { MakeOptions, api } from "@electron-forge/core";
import path from "path";
import { exec } from "../tools/exec.js";
import { downloadGithubRelease, downloadLatestGithubRelease, type ReleaseAsset } from "../tools/github.js";
import { addToPath } from "../tools/misc.js";
import { dlxPath } from "../tools/paths.js";


//export async function forgeMake(opts?: MakeOptions) {
// await api.make(opts ? opts : {});
//}

/**
 * Starts the electron app in the current folder (executes "pnpx electron .").
 * @public
 */
export async function start() {
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