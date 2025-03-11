import type { MakerWixConfig } from "@electron-forge/maker-wix";
import type { ForgeConfig, ForgeConfigMaker, ForgeConfigPlugin, ForgeHookMap, ForgePackagerOptions, IForgeMaker, StartOptions } from "@electron-forge/shared-types";
import * as path from "path";
import { FusesPlugin, MakerWix, MakerZIP, fastGlob, fuses } from "../../lateImports.js";
import { isProd } from "../../tools.js";
import { getAllPackageExportsPaths, getPackageMain, getPackageVersion, getUpgradeCode } from "../../tools/package.js";
import { projectPath } from "../../tools/paths.js";
import { getPnpmPackages } from "../../tools/pnpm.js";
import { runForgeMake, runForgePackage, runForgeStart } from "../tools/forge.js";
import { prepareWixTools } from "./dependencies.js";

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
   * File Path can also be a glob pattern.
   * @default [".\/assets\/**\/*"]
   */
  additionalFilesToPackage?: string[];
  /**
   * All files matching this minimatch glob pattern will not be bundled in to the asar file.
   * Instead they will be put unter app.asar.unpacked but are still available under the path /app.asar/.
   * Multiple patterns can be listed by using "{pattern1,pattern2}".
   * @default undefined
   */
  externalFilesGlobPattern?: string | undefined;
  /**
   * All directories matching this minimatch glob pattern will not be bundled in to the asar file.
   * Instead they will be put unter app.asar.unpacked but are still available under the path /app.asar/.
   * Multiple patterns can be listed by using "{pattern1,pattern2}".
   * @default undefined
   */
  externalDirsGlobPattern?: string | undefined;
  /**
   * Line inside of pnpm-workspace.yaml to not include.
   * Every package needs to be listed explicitly (wildcard is not supported).
   * @default ["common"]
   */
  ignorePackages?: string[];
  /**
   * Include *.map files for exported package files.
   * In production mode defaults to false.
   * If not in Production defaults to true.
   */
  includePackageSourcemaps?: boolean;
  /**
   * include all files in assets directories, wich are besides an export file.
   * @default true;
   */
  includePackageAssets?: boolean;
  /**
   * Version for the Setup and the Software.
   * Can be Semantic (x.x.x) or windows Style (x.x.x.x).
   * Takes the version from package.json by default.
   */
  version?: string;
  /**
   * Make zip files.
   * @default true
   */
  makeZip?: boolean;
  /**
   * Make wix Setups files, only for windows on windows.
   * @default true
   */
  makeWix?: boolean;
  /**
   * Customize the the Wix Installer.
   */
  wixOptions?: {
    /**
     * Customization of the UI.
     * @see https://www.npmjs.com/package/electron-wix-msi
     * @default {}
     */
    ui?: Exclude<MakerWixConfig["ui"], undefined>;
    /**
     * extra featured for the installer.
     * @see https://www.npmjs.com/package/electron-wix-msi
     * @default undefined
     */
    features?: MakerWixConfig["features"] | undefined;
  },
  /**
  * list of platform-architecture combinations to build.
  * @default ["win32-x64","win32-arm64","linux-x64","linux-arm64","darwin-x64"]
  */
  targets?: CreateSetupsOptionsTarget[];
  /**
  * The directory where the electron app is.
  * @default process.cwd()
  */
  dir?: string;
  /**
   * Enable electron to run as node via the ELECTRON_RUN_AS_NODE env variable.
   * This feature is needed for process.fork to work.
   * Before setting this to true try to use the electron Utility Processes.
   * @default false
   */
  fuseRunAsNode?: boolean;
  /**
   * Options to override the package Config of electron forge.
   * @default {}
   */
  packageOptions?: ForgePackagerOptions;
  /**
   * Hooks for Forge to be able to Modify data before it is used.
   */
  hooks?: ForgeHookMap;
}

type CreateSetupOptionsNorm = Required<Omit<CreateSetupsOptions, "wixOptions">> & { wixOptions: Required<Exclude<CreateSetupsOptions["wixOptions"], undefined>>; };

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
    const packPath = path.resolve(options.dir, pack);
    const jsonPath = path.resolve(packPath, "package.json");
    const exports = (await getAllPackageExportsPaths(jsonPath)).map((p) => path.resolve(packPath, p));
    const files = [...exports];
    if (options.includePackageSourcemaps) {
      const mapFiles = exports.map((v) => v + ".map");
      files.push(...mapFiles);
    }
    if (options.includePackageAssets) {
      for (const ex of exports) {
        const glob = path.relative(options.dir, path.resolve(ex, "../assets/**/*")).replaceAll("\\", "/");
        files.push(...await (await fastGlob()).default(glob, { cwd: options.dir }));
      }
    }
    filesToInclude.addAllPaths(jsonPath, ...files);
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
    const files = await (await fastGlob()).default(options.additionalFilesToPackage, { cwd: options.dir });
    filesToInclude.addAllPaths(...files);
  }
  return function ignore(file: string): boolean {
    return !filesToInclude.hasPath(file.substring(1));
  };
}

async function createPackagerConfig(options: CreateSetupOptionsNorm): Promise<ForgePackagerOptions> {
  return {
    asar: {
      ...(options.externalFilesGlobPattern === undefined ? {} : { unpack: options.externalFilesGlobPattern }),
      ...(options.externalDirsGlobPattern === undefined ? {} : { unpackDir: options.externalDirsGlobPattern }),
    },
    derefSymlinks: true,
    icon: "icons/appIcon",
    ignore: await generateIgnoreFunction(options),
    appVersion: options.version,
    ...options.packageOptions,
  };
}


function addPluginMarker<T extends {}>(instance: T): T {
  if ("__isElectronForgePlugin" in instance && instance.__isElectronForgePlugin === true) return instance;
  (<any>instance).__isElectronForgePlugin = true;
  return instance;
}

async function createMakersConfig(options: CreateSetupOptionsNorm, platform: CreateSetupsOptionsPlatform, _arch: CreateSetupsOptionsArch): Promise<ForgeConfigMaker[]> {
  const ret: IForgeMaker[] = [];
  if (options.makeZip) {
    if (process.platform === "win32" && platform === "darwin") {
      console.warn("Building Darwin zips on windows is not supported => Skipped");
    } else {
      ret.push(addPluginMarker(new (await MakerZIP()).MakerZIP()));
    }
  }
  if (options.makeWix && platform === "win32") {
    if (process.platform !== "win32") {
      console.warn("Building Wix Installers is only possible on windows => Skipped");
    } else {
      await prepareWixTools();
      const config: MakerWixConfig = {
        icon: "icons/installerIcon.ico",
        upgradeCode: await getUpgradeCode(),
        ui: options.wixOptions.ui,
        version: options.version,
      };
      if (options.wixOptions.features !== undefined) config.features = options.wixOptions.features;
      ret.push(addPluginMarker(new (await MakerWix()).MakerWix(config)));
    }
  }
  return ret;
}

async function createFusePlugin(options: CreateSetupOptionsNorm): Promise<ForgeConfigPlugin> {
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

async function createPluginsConfig(options: CreateSetupOptionsNorm): Promise<ForgeConfigPlugin[]> {
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
    hooks: {
      ...options.hooks,
      // Override Package Version field with argument supplied Version
      async readPackageJson(forgeConfig, packageJson) {
        packageJson = {
          ...packageJson,
          version: options.version,
        };
        if (typeof options.hooks.readPackageJson === "function") packageJson = await options.hooks.readPackageJson(forgeConfig, packageJson) ?? packageJson;
      }
    }
  };
}

function deduplicateStringArray<T extends string>(arr: T[]): T[] {
  return [...(new Set(arr)).values()];
}

async function normalizeCreateSetupOptions(options: CreateSetupsOptions = {}): Promise<CreateSetupOptionsNorm> {
  return {
    additionalFilesToPackage: options.additionalFilesToPackage ?? [".\/assets\/**\/*"],
    externalFilesGlobPattern: options.externalFilesGlobPattern,
    externalDirsGlobPattern: options.externalDirsGlobPattern,
    ignorePackages: options.ignorePackages ?? ["common"],
    includePackageSourcemaps: options.includePackageSourcemaps ?? !isProd(),
    includePackageAssets: options.includePackageAssets ?? true,
    version: options.version ?? await getPackageVersion() ?? "1.0.0",
    makeZip: options.makeZip ?? true,
    makeWix: options.makeWix ?? true,
    wixOptions: {
      ui: options.wixOptions?.ui ?? {},
      features: options.wixOptions?.features,
    },
    targets: deduplicateStringArray(options.targets ?? ["win32-x64", "win32-arm64", "linux-x64", "linux-arm64", "darwin-x64"]),
    dir: options.dir ?? projectPath,
    fuseRunAsNode: options.fuseRunAsNode ?? false,
    packageOptions: options.packageOptions ?? {},
    hooks: options.hooks ?? {},
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
  const optionsNorm = await normalizeCreateSetupOptions(options);
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
  const optionsNorm = await normalizeCreateSetupOptions(configOptions);
  await runForgeStart({ dir: optionsNorm.dir, ...startOptions }, await createForgeConfig(optionsNorm));
}