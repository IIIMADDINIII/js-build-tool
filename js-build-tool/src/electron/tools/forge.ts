import { type MakeOptions, type PackageOptions, type PublishOptions, type StartOptions } from "@electron-forge/core";
import type { ElectronProcess, ForgeConfig } from "@electron-forge/shared-types";
import fs from "fs-extra";
import * as module from "module";
import * as path from "path";
import { forge } from "../../lateImports.js";

// ToDo: Remove these helpers as soon it is possible to provide a config through the api
declare module "module" {
  export const _cache: { [key: string]: unknown; };
  export const _pathCache: { [key: string]: string; };
}

const configMap: Map<string, ForgeConfig> = new Map();
function pathExists(path: string): Promise<boolean>;
function pathExists(path: string, callback: (err: NodeJS.ErrnoException | null, exists: boolean) => void): void;
function pathExists(path: string, callback?: (err: NodeJS.ErrnoException | null, exists: boolean) => void): Promise<boolean> | void {
  if (configMap.has(path)) return Promise.resolve(true);
  if (callback === undefined) return origExists(path);
  return origExists(path, callback);
};
const origExists = fs.pathExists;
fs.pathExists = pathExists;

function registerForgeConfigForDirectory(dir: string = process.cwd(), config: ForgeConfig | undefined | null) {
  const resolved = path.resolve(dir, "forge.config.js");
  if (config === undefined || config === null) {
    configMap.delete(resolved);
    delete module._cache[resolved];
    delete module._pathCache[resolved + "\x00"];
    return;
  }
  configMap.set(resolved, config);
  module._cache[resolved] = { exports: config };
  module._pathCache[resolved + "\x00"] = resolved;
}

function makeInteractiveDefault<T extends { interactive?: boolean; }>(options: T): T {
  return {
    interactive: true,
    ...options,
  };
}

/**
 * Package the electron app using electron forge.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.PackageOptions.html) for the package Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @public
 */
export async function runForgePackage(options: PackageOptions = {}, config?: ForgeConfig): Promise<void> {
  options = makeInteractiveDefault(options);
  registerForgeConfigForDirectory(options.dir, config);
  await (await forge()).api.package(options);
  registerForgeConfigForDirectory(options.dir, null);
}

/**
 * Makes the electron app using electron forge.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.MakeOptions.html) for the make Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @public
 */
export async function runForgeMake(options: MakeOptions = {}, config?: ForgeConfig): Promise<void> {
  options = makeInteractiveDefault(options);
  registerForgeConfigForDirectory(options.dir, config);
  await (await forge()).api.make(options);
  registerForgeConfigForDirectory(options.dir, null);
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @public
 */
export async function runForgePublish(options: PublishOptions = {}, config?: ForgeConfig): Promise<void> {
  options = makeInteractiveDefault(options);
  registerForgeConfigForDirectory(options.dir, config);
  await (await forge()).api.publish(options);
  registerForgeConfigForDirectory(options.dir, null);
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @public
 */
export async function runForgeStart(options: StartOptions = {}, config?: ForgeConfig): Promise<void> {
  options = makeInteractiveDefault(options);
  registerForgeConfigForDirectory(options.dir, config);
  const spawned = await (await forge()).api.start(options);
  // Wait until electron process exits
  await new Promise<void>((resolve, reject) => {
    function listenForExit(child: ElectronProcess) {
      function removeListeners() {
        child.removeListener('exit', onExit);
        child.removeListener('restarted', onRestart);
      };
      function onExit(code: number) {
        removeListeners();
        if (spawned.restarted) return;
        if (code !== 0) {
          return reject(new Error("electron exited with exitCode " + code));
        }
        resolve();
      };
      function onRestart(newChild: ElectronProcess) {
        removeListeners();
        listenForExit(newChild);
      };
      child.on('exit', onExit);
      child.on('restarted', onRestart);
    };
    listenForExit(spawned);
  });
  registerForgeConfigForDirectory(options.dir, null);
}