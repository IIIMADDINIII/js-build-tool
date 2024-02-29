import type { MakeOptions } from "@electron-forge/core";
import type { ForgeConfig } from "@electron-forge/shared-types";
import * as path from "path";
import { getPackageMain } from "../../tools/package.js";
import { projectPath } from "../../tools/paths.js";
import { runForgePackage } from "../tools/forge.js";

/**
 * Options on how to create the Setups.
 * @public
 */
export interface CreateSetupsOptions {
  /**
  * List of files to also package in to the Asar file ()
  * @default []
  */
  additionalFilesToPackage?: string[];
}

async function generateIgnoreFunction(options: CreateSetupsOptions): Promise<(file: string) => boolean> {
  const filesToInclude: Set<string> = new Set();
  const packageMain = await getPackageMain();
  if (packageMain !== undefined) {
    filesToInclude.add(path.resolve(packageMain));
  }
  if (options.additionalFilesToPackage !== undefined) {
    for (const file of options.additionalFilesToPackage) {
      filesToInclude.add(path.resolve(file));
    }
  }
  console.log("allow list: ", [...filesToInclude.values()]);
  return function ignore(file: string): boolean {
    console.log(filesToInclude.has(path.resolve(file)), file, path.resolve(file));
    return !filesToInclude.has(path.resolve(file));
  };
}

async function createPackagerConfig(options: CreateSetupsOptions): Promise<Exclude<ForgeConfig["packagerConfig"], undefined>> {
  return {
    asar: true,
    derefSymlinks: true,
    icon: "icons/appIcon",
    ignore: await generateIgnoreFunction(options),
  };
}

async function createForgeConfig(options?: CreateSetupsOptions): Promise<ForgeConfig> {
  if (options === undefined) {
    options = {};
  }
  return {
    packagerConfig: await createPackagerConfig(options),
  };
}

async function createForgeMakeOptions(_options?: CreateSetupsOptions): Promise<MakeOptions> {
  return {
    //@ts-ignore
    arch: ["x64", "arm64"],
    //@ts-ignore
    platform: ["win32", "linux", "darwin"],
    dir: projectPath,
  };
}

/**
 * Package and Make Setups with electron forge with sensible defaults.
 * @param options - options on how to create the Setups (default = {})
 * @public
 */
export async function createSetups(options?: CreateSetupsOptions): Promise<void> {
  const forgeConfig = await createForgeConfig(options);
  const makeOptions = await createForgeMakeOptions(options);
  await runForgePackage(makeOptions, forgeConfig);
}