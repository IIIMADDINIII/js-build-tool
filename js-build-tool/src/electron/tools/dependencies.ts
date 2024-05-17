import * as path from "path";
import { downloadGithubRelease, downloadLatestGithubRelease, type ReleaseAsset } from "../../tools/github.js";
import { addToPath, buildDir } from "../../tools/paths.js";

function getWixAsset(_version: string, assets: ReleaseAsset[]): ReleaseAsset | undefined {
  return assets.find((asset) => asset.name.endsWith("-binaries.zip"));
}

let wixInstalled = false;

/**
 * Downloads the wixToolset automatically and adds it to the path, so Electron Forge can use it.
 * Will only download once if called multiple times.
 * @param releaseTag - wich release of the wixToolset should be downloaded (undefined = latest).
 * @public
 */
export async function prepareWixTools(releaseTag?: string) {
  if (wixInstalled) return;
  const dlDir = path.resolve(buildDir, "download");
  const wixDir = path.resolve(dlDir, "wix3");
  if (typeof releaseTag == "string") {
    await downloadGithubRelease({ owner: "wixtoolset", repo: "wix3", destination: wixDir, getAsset: getWixAsset, tag: releaseTag, shouldExtract: true });
  } else {
    await downloadLatestGithubRelease({ owner: "wixtoolset", repo: "wix3", destination: wixDir, getAsset: getWixAsset, shouldExtract: true });
  }
  addToPath(wixDir);
  wixInstalled = true;
}