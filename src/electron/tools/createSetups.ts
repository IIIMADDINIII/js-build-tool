import { MakerZIP } from "@electron-forge/maker-zip";
import type { ForgeConfig, ForgeConfigMaker, ForgePackagerOptions, IForgeMaker } from "@electron-forge/shared-types";
import * as path from "path";
import { getAllPackageExportsPaths, getPackageMain } from "../../tools/package.js";
import { projectPath } from "../../tools/paths.js";
import { getPnpmPackages } from "../../tools/pnpm.js";
import { getDefault } from "../../util.js";
import { runForgeMake, runForgePackage } from "../tools/forge.js";

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
  * Architectures wich should be build.
  * @default true
  */
  arch: CreateSetupsOptionsArch[];
  /**
  * Platforms wich should be build.
  * @default true
  */
  platform: CreateSetupsOptionsPlatform[];
  /**
  * The directory where the electron app is.
  * @default process.cwd()
  */
  dir: string;
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
  (<any>instance).__isElectronForgePlugin = true;
  return instance;
}

async function createMakersConfig(options: CreateSetupsOptions): Promise<ForgeConfigMaker[]> {
  const ret: IForgeMaker[] = [];
  if (options.makeZips) {
    ret.push(addPluginMarker(new MakerZIP()));
  }
  return ret;
}

async function createForgeConfig(options: CreateSetupOptionsNorm): Promise<ForgeConfig> {
  return {
    packagerConfig: await createPackagerConfig(options),
    makers: await createMakersConfig(options),
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
    arch: deduplicateStringArray(getDefault(options?.arch, ["x64", "arm64"])),
    platform: deduplicateStringArray(getDefault(options?.platform, ["win32", "linux", "darwin"])),
    dir: getDefault(options?.dir, projectPath),
  };
}

/**
 * Package and Make Setups with electron forge with sensible defaults.
 * @param options - options on how to create the Setups (default = {})
 * @public
 */
export async function createSetups(options?: CreateSetupsOptions): Promise<void> {
  const optionsNorm = normalizeCreateSetupOptions(options);
  const forgeConfig = await createForgeConfig(optionsNorm);
  await runForgePackage({
    //@ts-ignore
    arch: options.arch,
    //@ts-ignore
    platform: options.platform,
    dir: optionsNorm.dir,
  }, forgeConfig);
  for (const arch of optionsNorm.arch) {
    for (const platform of optionsNorm.platform) {
      await runForgeMake({
        arch,
        platform,
        dir: optionsNorm.dir,
        skipPackage: true,
      }, forgeConfig);
    }
  }

}