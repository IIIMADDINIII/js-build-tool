// import { MakeOptions, api } from "@electron-forge/core";
import path from "path";
import { exec } from "../tools/exec.js";
import { downloadGithubRelease, downloadLatestGithubRelease, ReleaseAsset } from "../tools/github.js";
import { addToPath, dlxPath } from "../tools/misc.js";


//export async function forgeMake(opts?: MakeOptions) {
// await api.make(opts ? opts : {});
//}

export async function start() {
  await exec`pnpx electron .`;
}

function getWixAsset(_version: string, assets: ReleaseAsset[]): ReleaseAsset | undefined {
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