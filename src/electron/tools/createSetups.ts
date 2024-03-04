import type { MakeOptions } from "@electron-forge/core";
import type { ForgeConfig } from "@electron-forge/shared-types";
import * as path from "path";
import { getAllPackageExportsPaths, getPackageMain } from "../../tools/package.js";
import { projectPath } from "../../tools/paths.js";
import { getPnpmPackages } from "../../tools/pnpm.js";
import { getDefault } from "../../util.js";
import { runForgePackage } from "../tools/forge.js";

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
  console.log("allow list: ", [...filesToInclude.values()]);
  return function ignore(file: string): boolean {
    console.log(filesToInclude.hasPath(file.substring(1)), file, path.resolve(options.dir, file.substring(1)));
    return !filesToInclude.hasPath(file.substring(1));
  };
}

async function createPackagerConfig(options: CreateSetupOptionsNorm): Promise<Exclude<ForgeConfig["packagerConfig"], undefined>> {
  return {
    asar: true,
    derefSymlinks: true,
    icon: "icons/appIcon",
    ignore: await generateIgnoreFunction(options),
  };
}

async function createForgeConfig(options: CreateSetupOptionsNorm): Promise<ForgeConfig> {
  return {
    packagerConfig: await createPackagerConfig(options),
  };
}

async function createForgeMakeOptions(options: CreateSetupOptionsNorm): Promise<MakeOptions> {
  return {
    //@ts-ignore
    arch: ["x64", "arm64"],
    //@ts-ignore
    platform: ["win32", "linux", "darwin"],
    dir: options.dir,
  };
}

function normalizeCreateSetupOptions(options?: CreateSetupsOptions): CreateSetupOptionsNorm {
  return {
    additionalFilesToPackage: getDefault(options?.additionalFilesToPackage, []),
    ignorePackages: getDefault(options?.ignorePackages, ["common"]),
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
  const makeOptions = await createForgeMakeOptions(optionsNorm);
  await runForgePackage(makeOptions, forgeConfig);
}