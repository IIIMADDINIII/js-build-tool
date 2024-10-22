import { type MakeOptions, type PackageOptions, type PublishOptions, type StartOptions } from "@electron-forge/core";
import type { ElectronProcess, ForgeConfig, ForgeMakeResult } from "@electron-forge/shared-types";
import { forge } from "../../lateImports.js";

function makeInteractiveDefault<T extends { interactive?: boolean; }>(options: T): T {
  return {
    interactive: true,
    ...options,
  };
}

async function registerOptionalConfig<T>(options: { dir?: string; }, config: ForgeConfig | undefined, fn: () => Promise<T>): Promise<T> {
  if (config === undefined) return await fn();
  const dir = options.dir ?? process.cwd();
  (await forge()).utils.registerForgeConfigForDirectory(dir, config as any);
  try {
    return await fn();
  } finally {
    (await forge()).utils.unregisterForgeConfigForDirectory(dir);
  }
}

/**
 * Package the electron app using electron forge.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.PackageOptions.html) for the package Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @public
 */
export async function runForgePackage(options: PackageOptions = {}, config?: ForgeConfig): Promise<void> {
  options = makeInteractiveDefault(options);
  return registerOptionalConfig(options, config, async () => await (await forge()).api.package(options));
}

/**
 * Makes the electron app using electron forge.
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.MakeOptions.html) for the make Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @returns Metadata about the Make Result
 * @public
 */
export async function runForgeMake(options: MakeOptions = {}, config?: ForgeConfig): Promise<ForgeMakeResult[]> {
  options = makeInteractiveDefault(options);
  return registerOptionalConfig(options, config, async () => await (await forge()).api.make(options));
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @public
 */
export async function runForgePublish(options: PublishOptions = {}, config?: ForgeConfig): Promise<void> {
  options = makeInteractiveDefault(options);
  return registerOptionalConfig(options, config, async () => await (await forge()).api.publish(options));
}

/**
 * Starts the electron app in the current folder (using electron forge).
 * @param options - [Options](https://js.electronforge.io/interfaces/_electron_forge_core.StartOptions.html) for the Start Command (default = {}).
 * @param config - Optional [configuration](https://js.electronforge.io/modules/_electron_forge_shared_types.html#ForgeConfig) wich will be used instead of the configuration on disk.
 * @public
 */
export async function runForgeStart(options: StartOptions = {}, config?: ForgeConfig): Promise<void> {
  options = makeInteractiveDefault(options);
  registerOptionalConfig(options, config, async () => {
    const spawned = await (await forge()).api.start(options);
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
  });
}