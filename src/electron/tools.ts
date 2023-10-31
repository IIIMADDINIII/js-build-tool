// import { MakeOptions, api } from "@electron-forge/core";
import type { OctokitReleaseAssets } from "fetch-github-release/dist/types.js";
import path from "path";
import { addToPath, dlxPath, downloadGithubRelease, downloadLatestGithubRelease, exec } from "../tools/misc.js";


//export async function forgeMake(opts?: MakeOptions) {
// await api.make(opts ? opts : {});
//}

export async function start() {
  await exec`pnpx electron .`;
}

function getWixAsset(_version: string, assets: OctokitReleaseAssets): OctokitReleaseAssets[number] | undefined {
  return assets.find((asset) => asset.name.endsWith("-binaries.zip"));
}

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