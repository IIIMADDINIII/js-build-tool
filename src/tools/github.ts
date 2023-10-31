import { fetchLatestRelease, fetchReleaseByTag, type FetchReleaseOptions } from "fetch-github-release";

export type ReleaseAssets = Parameters<Required<FetchReleaseOptions>["getAsset"]>[1];
export type ReleaseAsset = ReleaseAssets[number];

export type DownloadLatestGithubReleaseOptions = Parameters<typeof fetchLatestRelease>[0];
export async function downloadLatestGithubRelease(options: DownloadLatestGithubReleaseOptions) {
  await fetchLatestRelease(options);
}

export type DownloadGithubReleaseOptions = Parameters<typeof fetchReleaseByTag>[0];
export async function downloadGithubRelease(options: DownloadGithubReleaseOptions) {
  await fetchReleaseByTag(options);
}