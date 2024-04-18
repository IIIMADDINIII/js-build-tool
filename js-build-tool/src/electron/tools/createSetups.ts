import type { ForgeConfig, ForgeConfigMaker, ForgeConfigPlugin, ForgePackagerOptions, IForgeMaker, StartOptions } from "@electron-forge/shared-types";
import * as path from "path";
import { FusesPlugin, MakerZIP, fuses } from "../../lateImports.js";
import { getAllPackageExportsPaths, getPackageMain } from "../../tools/package.js";
import { projectPath } from "../../tools/paths.js";
import { getPnpmPackages } from "../../tools/pnpm.js";
import { getDefault } from "../../util.js";
import { runForgeMake, runForgePackage, runForgeStart } from "../tools/forge.js";

/**
 * Architectures which are supported.
 * @public
 */
export type CreateSetupsOptionsArch = "x64" | "arm64";
/**
 * Platforms wich are supported.
 * @public
 */
export type CreateSetupsOptionsPlatform = "win32" | "linux" | "darwin";

/**
 * List of supported Targets for building.
 * @public
 */
export type CreateSetupsOptionsTarget = Exclude<`${CreateSetupsOptionsPlatform}-${CreateSetupsOptionsArch}`, "darwin-arm64">;

/**
 * Options on how to create the Setups.
 * @public
 */
export interface CreateSetupsOptions {
  /**
  * List of files to also package in to the Asar file.
  * By default only the main package.json and sub-packages and the exported members get included.
  * Every package needs to be listed explicitly (wildcard is not supported).
  * @default []
  */
  additionalFilesToPackage: string[];
  /**
  * Line inside of pnpm-workspace.yaml to not include.
  * Every package needs to be listed explicitly (wildcard is not supported).
  * @default ["common"]
  */
  ignorePackages: string[];
  /**
  * Make zip files.
  * @default true
  */
  makeZips: boolean;
  /**
  * list of platform-architecture combinations to build.
  * @default ["win32-x64","win32-arm64","linux-x64","linux-arm64","darwin-x64"]
  */
  targets: CreateSetupsOptionsTarget[];
  /**
  * The directory where the electron app is.
  * @default process.cwd()
  */
  dir: string;
  /**
   * Enable electron to run as node via the ELECTRON_RUN_AS_NODE env variable.
   * This feature is needed for process.fork to work.
   * Before setting this to true try to use the electron Utility Processes.
   * @default false
   */
  fuseRunAsNode: boolean;
}

type CreateSetupOptionsNorm = Required<CreateSetupsOptions>;

class PathSet extends Set<string> {
  #path: string;
  constructor(resolveRelativeTo: string) {
    super();
    this.#path = resolveRelativeTo;
  }
  addAllPaths(...paths: string[]): void {
    for (let p of paths) {
      p = path.resolve(this.#path, p);
      while (true) {
        if (this.has(p)) break;
        this.add(p);
        p = path.resolve(p, "..");
      }
    }
  }
  hasPath(p: string): boolean {
    return this.has(path.resolve(this.#path, p));
  }
}

async function addPackagesToFilesToInclude(options: CreateSetupOptionsNorm, filesToInclude: PathSet): Promise<void> {
  const packages = await getPnpmPackages();
  if (packages === undefined) return;
  for (const pack of packages) {
    if (options.ignorePackages.includes(pack)) continue;
    if (pack.includes("*")) console.warn(`Entry ${pack} inside pnpm-workspace.yaml is ignored because it includes a wildcard`);
    const packPath = path.resolve(options.dir, pack);
    const jsonPath = path.resolve(packPath, "package.json");
    const exports = (await getAllPackageExportsPaths(jsonPath)).map((p) => path.resolve(packPath, p));
    filesToInclude.addAllPaths(jsonPath, ...exports);
  }
}

async function generateIgnoreFunction(options: CreateSetupOptionsNorm): Promise<(file: string) => boolean> {
  const filesToInclude = new PathSet(options.dir);
  filesToInclude.addAllPaths("package.json");
  await addPackagesToFilesToInclude(options, filesToInclude);
  const packageMain = await getPackageMain();
  if (packageMain !== undefined) {
    filesToInclude.addAllPaths(packageMain);
  }
  if (options.additionalFilesToPackage !== undefined) {
    filesToInclude.addAllPaths(...options.additionalFilesToPackage);
  }
  return function ignore(file: string): boolean {
    return !filesToInclude.hasPath(file.substring(1));
  };
}

async function createPackagerConfig(options: CreateSetupOptionsNorm): Promise<ForgePackagerOptions> {
  return {
    asar: true,
    derefSymlinks: true,
    icon: "icons/appIcon",
    ignore: await generateIgnoreFunction(options),
  };
}


function addPluginMarker<T extends {}>(instance: T): T {
  if ("__isElectronForgePlugin" in instance && instance.__isElectronForgePlugin === true) return instance;
  (<any>instance).__isElectronForgePlugin = true;
  return instance;
}

async function createMakersConfig(options: CreateSetupsOptions, platform: CreateSetupsOptionsPlatform, _arch: CreateSetupsOptionsArch): Promise<ForgeConfigMaker[]> {
  const ret: IForgeMaker[] = [];
  if (options.makeZips) {
    if (process.platform === "win32" && platform === "darwin") {
      console.warn("Building Darwin zips on windows is not supported => Skipped");
    } else {
      ret.push(addPluginMarker(new (await MakerZIP()).MakerZIP()));
    }
  }
  return ret;
}

async function createFusePlugin(options: CreateSetupsOptions): Promise<ForgeConfigPlugin> {
  return addPluginMarker(new (await FusesPlugin()).FusesPlugin({
    version: (await fuses()).FuseVersion.V1,
    [(await fuses()).FuseV1Options.RunAsNode]: options.fuseRunAsNode,
    [(await fuses()).FuseV1Options.EnableCookieEncryption]: true,
    [(await fuses()).FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [(await fuses()).FuseV1Options.EnableNodeCliInspectArguments]: false,
    [(await fuses()).FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
    [(await fuses()).FuseV1Options.OnlyLoadAppFromAsar]: true,
    [(await fuses()).FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [(await fuses()).FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  }));
}

async function createPluginsConfig(options: CreateSetupsOptions): Promise<ForgeConfigPlugin[]> {
  return [await createFusePlugin(options)];
}


function getRunningTarget(): CreateSetupsOptionsTarget {
  const platform = process.platform;
  if (platform !== "win32" && platform !== "linux" && platform !== "darwin") throw new Error("running on unsupported platform: " + platform);
  const arch = process.arch;
  if (arch !== "x64" && arch !== "arm64") throw new Error("running on unsupported architecture: " + arch);
  const target = `${platform}-${arch}` as const;
  if (target === "darwin-arm64") throw new Error("arm64 on darwin is not supported");
  return target;
}

/**
 * Generates an forge config to use with the runForge commands.
 * @param options - options on how to create the config.
 * @param platform - target platform of the config (default = process.platform).
 * @returns the generated forge config as a js object
 * @public
 */
export async function createForgeConfig(options: CreateSetupOptionsNorm, target: CreateSetupsOptionsTarget = getRunningTarget()): Promise<ForgeConfig> {
  const [platform, arch] = getPlatformArch(target);
  return {
    packagerConfig: await createPackagerConfig(options),
    makers: await createMakersConfig(options, platform, arch),
    plugins: await createPluginsConfig(options),
  };
}

function deduplicateStringArray<T extends string>(arr: T[]): T[] {
  return [...(new Set(arr)).values()];
}

function normalizeCreateSetupOptions(options?: CreateSetupsOptions): CreateSetupOptionsNorm {
  return {
    additionalFilesToPackage: getDefault(options?.additionalFilesToPackage, []),
    ignorePackages: getDefault(options?.ignorePackages, ["common"]),
    makeZips: getDefault(options?.makeZips, true),
    targets: deduplicateStringArray(getDefault(options?.targets, ["win32-x64", "win32-arm64", "linux-x64", "linux-arm64", "darwin-x64"])),
    dir: getDefault(options?.dir, projectPath),
    fuseRunAsNode: getDefault(options?.fuseRunAsNode, false),
  };
}

function getPlatformArch(target: CreateSetupsOptionsTarget): [CreateSetupsOptionsPlatform, CreateSetupsOptionsArch] {
  return target.split("-") as [CreateSetupsOptionsPlatform, CreateSetupsOptionsArch];
}

/**
 * Package and Make Setups with electron forge with sensible defaults.
 * @param options - options on how to create the Setups (default = {})
 * @public
 */
export async function createSetups(options?: CreateSetupsOptions): Promise<void> {
  const optionsNorm = normalizeCreateSetupOptions(options);
  for (const target of optionsNorm.targets) {
    const [platform, arch] = getPlatformArch(target);
    const forgeConfig = await createForgeConfig(optionsNorm, target);
    // if there are no makers then only package
    if (forgeConfig.makers === undefined || forgeConfig.makers.length === 0) {
      await runForgePackage({
        arch,
        platform,
        dir: optionsNorm.dir,
      }, forgeConfig);
    } else {
      await runForgeMake({
        arch,
        platform,
        dir: optionsNorm.dir,
      }, forgeConfig);
    }
  }
}

/**
 * Generates a forge config and then runs electron forge start command.
 * @param startOptions - options on how to start electron.
 * @param configOptions - options on how to create the forge config.
 * @public
 */
export async function start(startOptions?: StartOptions, configOptions?: CreateSetupsOptions) {
  const optionsNorm = normalizeCreateSetupOptions(configOptions);
  await runForgeStart({ dir: optionsNorm.dir, ...startOptions }, await createForgeConfig(optionsNorm));
}