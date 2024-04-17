
import type { MakeOptions, PackageOptions, PublishOptions, StartOptions } from "@electron-forge/core";
import type { ForgeConfig } from "@electron-forge/shared-types";
import type { TaskFunction } from "../tools/gulp.js";
import { setDisplayName } from "../tools/misc.js";
import * as tools from "./tools.js";
import type { CreateSetupsOptions } from "./tools/createSetups.js";


/**
 * Package and Make Setups with electron forge with sensible defaults.
 * Can be directly used as an Gulp Task.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.PackageOptions.html) for the package Command (default = {}).
 * @returns A Gulp Task
 * @public
 */
export function createSetups(options?: CreateSetupsOptions): TaskFunction {
  return setDisplayName("createSetups", async function createSetups() {
    await tools.createSetups(options);
  });
}

/**
 * Package the electron app using electron forge.
 * Can be directly used as an Gulp Task.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.PackageOptions.html) for the package Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @returns A Gulp Task
 * @public
 */
export function runForgePackage(options: PackageOptions = {}, config?: ForgeConfig): TaskFunction {
  return setDisplayName("runForgePackage", async function runForgePackage() {
    await tools.runForgePackage(options, config);
  });
}

/**
 * Makes the electron app using electron forge.
 * Can be directly used as an Gulp Task.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.MakeOptions.html) for the make Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @returns A Gulp Task
 * @public
 */
export function runForgeMake(options: MakeOptions = {}, config?: ForgeConfig): TaskFunction {
  return setDisplayName("runForgeMake", async function runForgeMake() {
    await tools.runForgeMake(options, config);
  });
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * Can be directly used as an Gulp Task.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @returns A Gulp Task
 * @public
 */
export function runForgePublish(options: PublishOptions = {}, config?: ForgeConfig): TaskFunction {
  return setDisplayName("runForgePublish", async function runForgePublish() {
    await tools.runForgePublish(options, config);
  });
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * Can be directly used as an Gulp Task.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @returns A Gulp Task
 * @public
 */
export function runForgeStart(options: StartOptions = {}, config?: ForgeConfig): TaskFunction {
  return setDisplayName("runForgeStart", async function runForgeStart() {
    await tools.runForgeStart(options, config);
  });
}

/**
 * Downloads the wixtoolset automatically and adds it to the path, so Electron Forge can use it.
 * Can be directly used as an Gulp Task.
 * @param releaseTag - wich release of the wixtoolset should be downloaded (default = latest).
 * @returns A Gulp Task
 * @public
 */
export function prepareWixTools(releaseTag?: string): TaskFunction {
  return setDisplayName("prepareWixTools", async function prepareWixTools() {
    await tools.prepareWixTools(releaseTag);
  });
}

/**
 * Generates a forge config and then runs electron forge start command.
 * Can be directly used as an Gulp Task.
 * @param startOptions - options on how to start electron.
 * @param configOptions - options on how to create the forge config.
 * @returns A Gulp Task
 * @public
 */
export function start(startOptions?: StartOptions, configOptions?: CreateSetupsOptions): TaskFunction {
  return setDisplayName("start", async function start() {
    await tools.start(startOptions, configOptions);
  });
}
