import { fetchLatestRelease, fetchReleaseByTag, type FetchReleaseOptions } from "fetch-github-release";

/**
 * A list of multiple Assets.
 * @public
 */
export type ReleaseAssets = Parameters<Required<FetchReleaseOptions>["getAsset"]>[1];

/**
 * Data of one of the Assets.
 * @public
 */
export type ReleaseAsset = ReleaseAssets[number];

/**
 * Options for the downloadLatestGithubRelease function.
 * @public
 */
export interface DownloadLatestGithubReleaseOptions {
  /**
   * The Owner of the repo.
   */
  owner: string;
  /**
   * The name of the repo.
   */
  repo: string;
  /**
   * Destination for the downloaded file.
   */
  destination: string;
  /**
   * should the file be extracted?
   */
  shouldExtract?: boolean;
  /**
   * Callback function to identify the right asset to download.
   * @param version - version of the release.
   * @param assets - additional information for the asset.
   * @returns one entry of the assets array.
   */
  getAsset?: (version: string, assets: ReleaseAssets) => ReleaseAsset | undefined;
}

/**
 * Download the latest github release of an repository.
 * @param options - options on how to get the release downloaded
 * @public
 */
export async function downloadLatestGithubRelease(options: DownloadLatestGithubReleaseOptions): Promise<void> {
  await fetchLatestRelease(options);
}

/**
 * Options for the downloadGithubRelease function.
 * @public
 */
export interface DownloadGithubReleaseOptions {
  /**
   * The Owner of the repo.
   */
  owner: string;
  /**
   * The name of the repo.
   */
  repo: string;
  /**
   * The tag of the release.
   */
  tag: string;
  /**
   * Destination for the downloaded file.
   */
  destination: string;
  /**
   * should the file be extracted?
   */
  shouldExtract?: boolean;
  /**
   * Callback function to identify the right asset to download.
   * @param version - version of the release.
   * @param assets - additional information for the asset.
   * @returns one entry of the assets array.
   */
  getAsset?: (version: string, assets: ReleaseAssets) => ReleaseAsset | undefined;
}

/**
 * Downloads an Asset of a specific release token.
 * @param options - options on how to get the release downloaded
 * @public
 */
export async function downloadGithubRelease(options: DownloadGithubReleaseOptions): Promise<void> {
  await fetchReleaseByTag(options);
}