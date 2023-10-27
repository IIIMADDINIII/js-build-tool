import commonjs, { RollupCommonJSOptions } from '@rollup/plugin-commonjs';
import json, { RollupJsonOptions } from "@rollup/plugin-json";
import { RollupNodeResolveOptions, nodeResolve } from '@rollup/plugin-node-resolve';
import terser, { Options as TerserOptions } from "@rollup/plugin-terser";
import typescript, { RollupTypescriptOptions } from "@rollup/plugin-typescript";
import * as fs from "fs/promises";
import * as path from "path";
import type { OutputOptions, Plugin, RollupOptions } from "rollup";
import { consts } from 'rollup-plugin-consts';
import sourceMaps, { SourcemapsPluginOptions } from 'rollup-plugin-include-sourcemaps';
import { isProd } from "../../tools/misc.js";
import { getPackageDependencies, getPackageDevDependencies, getPackageType, topLevelExports } from "../../tools/package.js";
import { ManageDependenciesConfig, manageDependencies } from "../plugins.js";
import { run, type CommandOptions } from "./run.js";


export type NoDefaults<T extends {}> = T & { noDefaults?: boolean; };
export type OutputFormat = "es" | "commonjs";
export type ExecutionEnvironment = "node" | "browser";
export type ExportType = "app" | "lib";
export type SourceMapType = "external" | "inline";

export interface DefaultConfigsOutput {
  hookOutputOptions?(options: DefaultConfigsOutput): Promise<DefaultConfigsOutput | undefined> | DefaultConfigsOutput | undefined;
  outputFileDir?: string;
  outputFileName: string;
  outputFileExt?: string;
  outputFormat: OutputFormat;
  isSingleFormat?: boolean;
  cjsOutputDir?: string;
  mjsOutputDir?: string;
  singleOutputDir?: string;
  cjsOutputExt?: string;
  mjsOutputExt?: string;
  singleOutputExt?: string;
  testOutputDir?: string;
}

export interface DefaultConfigsExports extends Partial<DefaultConfigsOutput> {
  hookOptions?(exportName: string, options: DefaultConfigsExports): Promise<[string, DefaultConfigsExports] | undefined> | [string, DefaultConfigsExports] | undefined;
  environment?: ExecutionEnvironment;
  type?: ExportType;
  prod?: boolean;
  minify?: boolean;
  sourceMap?: boolean;
  sourceMapType?: SourceMapType;
  generateDeclaration?: boolean;
  defaultLib?: string[];
  browserLib?: string[];
  nodeLib?: string[];
  externalDependencies?: string[];
  blacklistDependencies?: string[];
  allowedDevDependencies?: string[];
  blacklistDevDependencies?: boolean;
  defaultExportName?: string;
  inputFileDir?: string;
  inputFileName?: string;
  inputFileExt?: string;
  outputs?: DefaultConfigsOutput[];
  plugins?: Plugin[];
  terserPlugin?: NoDefaults<TerserOptions>;
  manageDependenciesPlugin?: NoDefaults<ManageDependenciesConfig>;
  constsPlugin?: NoDefaults<{ [name: string]: any; }>;
  jsonPlugin?: NoDefaults<RollupJsonOptions>;
  commonjsPlugin?: NoDefaults<RollupCommonJSOptions>;
  typescriptPlugin?: NoDefaults<RollupTypescriptOptions>;
  sourceMapsPlugin?: NoDefaults<SourcemapsPluginOptions>;
  nodeResolvePlugin?: NoDefaults<RollupNodeResolveOptions>;
  isTest?: boolean;
  buildTest?: boolean;
};

export interface DefaultConfigs extends DefaultConfigsExports {
  testsFolderInBasePath?: string;
  testFilePrefix?: string;
  inputBasePath?: string;
  exports?: string[] | { [key: string]: DefaultConfigsExports; };
  additionalExports?: string[] | { [key: string]: DefaultConfigsExports; };
}

async function runHookOptions(exportName: string, options: DefaultConfigsExports): Promise<[string, DefaultConfigsExports]> {
  if (options.hookOptions) {
    let ret = await options.hookOptions(exportName, options);
    if (ret !== undefined) return ret;
  }
  return [exportName, options];
}

async function runHookOutputOptions(options: DefaultConfigsOutput): Promise<DefaultConfigsOutput> {
  if (options.hookOutputOptions) {
    let ret = await options.hookOutputOptions(options);
    if (ret !== undefined) return ret;
  }
  return options;
}


function getDefaultFileName(name: string, defaultName: string) {
  if (name.startsWith("./")) name = name.slice(2);
  if (name == ".") name = defaultName;
  return name;
}

function getTypescriptDefaultOptions(options: DefaultConfigsExports): NoDefaults<RollupTypescriptOptions> {
  options.generateDeclaration = getDefault(options.generateDeclaration, !options.prod || options.type === "lib");
  options.defaultLib = getDefault(options.defaultLib, ["ESNext"]);
  options.browserLib = getDefault(options.browserLib, ["DOM"]);
  options.nodeLib = getDefault(options.nodeLib, []);
  let lib = [...options.defaultLib];
  if (options.environment === "browser") {
    lib.push(...options.browserLib);
  }
  if (options.environment === "node") {
    lib.push(...options.nodeLib);
  }
  let ret: RollupTypescriptOptions = {
    noEmitOnError: true,
    outputToFilesystem: true,
    declaration: options.generateDeclaration,
    declarationMap: options.generateDeclaration,
    lib,
  };
  if (!options.sourceMap) {
    ret.sourceMap = false;
    ret.inlineSources = undefined;
  }
  return ret;
}

async function getManageDependenciesDefaultOptions(options: DefaultConfigsExports): Promise<NoDefaults<ManageDependenciesConfig>> {
  options.externalDependencies = getDefault(options.externalDependencies, []);
  options.blacklistDependencies = getDefault(options.blacklistDependencies, []);
  options.allowedDevDependencies = getDefault(options.allowedDevDependencies, []);
  options.blacklistDevDependencies = getDefault(options.blacklistDevDependencies, true);
  let deps = Object.keys(await getPackageDependencies());
  let blacklist = [...options.blacklistDependencies];
  if (options.blacklistDevDependencies) {
    let devDeps = new Set(Object.keys(await getPackageDevDependencies()));
    for (let allowed of options.allowedDevDependencies) {
      devDeps.delete(allowed);
    }
    blacklist.push(...devDeps.values());
  }
  if (options.type === "lib") {
    return { external: [...options.externalDependencies, ...deps.values()], blacklist: blacklist };
  } else if (options.type === "app") {
    return { external: options.externalDependencies, blacklist: blacklist };
  }
  return {};
}

function getNodeResolveDefaultOptions(options: DefaultConfigsExports): NoDefaults<RollupNodeResolveOptions> {
  if (options.environment === "node") {
    return { browser: false, exportConditions: ["node"] };
  } else if (options.environment === "browser") {
    return { browser: true };
  }
  return {};
}

async function getDefaultPlugins(options: DefaultConfigsExports): Promise<Plugin[]> {
  options.manageDependenciesPlugin = conditionalMerge(options.manageDependenciesPlugin, await getManageDependenciesDefaultOptions(options));
  options.isTest = getDefault(options.isTest, false);
  options.constsPlugin = conditionalMerge(options.constsPlugin, { production: options.prod, development: !options.prod, testing: options.isTest });
  options.jsonPlugin = conditionalMerge(options.jsonPlugin, {});
  options.commonjsPlugin = conditionalMerge(options.commonjsPlugin, {});
  options.typescriptPlugin = conditionalMerge(options.typescriptPlugin, getTypescriptDefaultOptions(options));
  options.sourceMapsPlugin = conditionalMerge(options.sourceMapsPlugin, {});
  options.nodeResolvePlugin = conditionalMerge(options.nodeResolvePlugin, getNodeResolveDefaultOptions(options));
  return [
    manageDependencies(options.manageDependenciesPlugin),
    consts(options.constsPlugin),
    json(options.jsonPlugin),
    commonjs(options.commonjsPlugin),
    typescript(options.typescriptPlugin),//getTypescriptOptions(config, discardDeclarations)),
    sourceMaps(options.sourceMapsPlugin),
    nodeResolve(options.nodeResolvePlugin),
  ];
}

function getDefault<T>(value: T | undefined, def: T): T {
  if (typeof value === "undefined") return def;
  return value;
}

function conditionalMerge<T extends NoDefaults<{}>>(value: T | undefined, def: T): Omit<T, "noDefaults"> {
  if (value === undefined) return def;
  let { noDefaults, ...rest } = value;
  if (noDefaults) {
    return rest;
  }
  return { ...def, ...rest };
};

function getDefaultOutput(options: DefaultConfigsOutput, isTest: boolean, singleOutput: string, mjsOutput: string, cjsOutput: string, testOutput: string): string {
  if (isTest) {
    return testOutput;
  }
  if (options.isSingleFormat) {
    return singleOutput;
  }
  if (options.outputFormat === "es") {
    return mjsOutput;
  } else if (options.outputFormat === "commonjs") {
    return cjsOutput;
  }
  return singleOutput;
}

async function generateOutput(options: DefaultConfigsOutput, isSingleFormat: boolean, isTest: boolean, sourceMap?: boolean, sourceMapType?: SourceMapType): Promise<OutputOptions> {
  options = await runHookOutputOptions(options);
  options.cjsOutputDir = getDefault(options.cjsOutputDir, "./dist/cjs/");
  options.mjsOutputDir = getDefault(options.mjsOutputDir, "./dist/esm/");
  options.singleOutputDir = getDefault(options.singleOutputDir, "./dist/");
  options.testOutputDir = getDefault(options.testOutputDir, "./tests/");
  options.cjsOutputExt = getDefault(options.cjsOutputExt, ".js");
  options.mjsOutputExt = getDefault(options.mjsOutputExt, ".js");
  options.singleOutputExt = getDefault(options.singleOutputExt, ".js");
  options.isSingleFormat = getDefault(options.isSingleFormat, isSingleFormat);
  options.outputFileDir = getDefault(options.outputFileDir, getDefaultOutput(options, isTest, options.singleOutputDir, options.mjsOutputDir, options.cjsOutputDir, options.testOutputDir));
  options.outputFileExt = getDefault(options.outputFileExt, getDefaultOutput(options, isTest, options.singleOutputExt, options.mjsOutputExt, options.cjsOutputExt, options.singleOutputExt));
  let sm: boolean | "inline" = sourceMap ? (sourceMapType === "inline" ? "inline" : true) : false;
  let file = path.resolve(options.outputFileDir, options.outputFileName + options.outputFileExt);
  return {
    file,
    format: options.outputFormat,
    sourcemap: sm,
  };
}

async function getDefaultOutputs(name: string, ext: string): Promise<DefaultConfigsOutput[]> {
  let type = await getPackageType();
  ext = ext.toLocaleLowerCase();
  if (ext === ".mts") {
    return [{
      outputFileName: name,
      outputFormat: "es",
    }];
  }
  if (ext === ".cts") {
    [{
      outputFileName: name,
      outputFormat: "commonjs",
    }];
  }
  if (type === "module") {
    return [{
      outputFileName: name,
      outputFormat: "es",
    }];
  }
  if (type === "commonjs") {
    return [{
      outputFileName: name,
      outputFormat: "commonjs",
    }];
  }
  return [{
    outputFileName: name,
    outputFormat: "es",
  }, {
    outputFileName: name,
    outputFormat: "commonjs",
  }];
}

function countFormats(outputs: DefaultConfigsOutput[]): number {
  let formats: Set<string> = new Set();
  for (let out of outputs) {
    formats.add(out.outputFormat);
  }
  return formats.size;
}

async function generateExport(exportName: string, options: DefaultConfigsExports, basePath: string): Promise<RollupOptions | undefined> {
  [exportName, options] = await runHookOptions(exportName, options);
  options.isTest = getDefault(options.isTest, false);
  options.buildTest = getDefault(options.buildTest, false);
  if (options.isTest && !options.buildTest) return undefined;
  options.environment = getDefault(options.environment, "node");
  options.type = getDefault(options.type, "lib");
  options.defaultExportName = getDefault(options.defaultExportName, "index");
  options.inputFileDir = getDefault(options.inputFileDir, basePath);
  options.inputFileExt = getDefault(options.inputFileExt, ".ts");
  options.inputFileName = getDefault(options.inputFileName, getDefaultFileName(exportName, options.defaultExportName));
  options.prod = getDefault(options.prod, isProd());
  options.sourceMap = getDefault(options.sourceMap, !options.prod);
  options.sourceMapType = getDefault(options.sourceMapType, "external");
  options.plugins = getDefault(options.plugins, await getDefaultPlugins(options));
  options.minify = getDefault(options.minify, options.prod);
  options.terserPlugin = conditionalMerge(options.terserPlugin, {});
  if (options.minify) {
    options.plugins.push(terser(options.terserPlugin));
  }
  options.outputs = getDefault(options.outputs, await getDefaultOutputs(options.inputFileName, options.inputFileExt));
  const isSingleFormat = countFormats(options.outputs) == 1;
  const isTest = options.isTest;
  const output = await Promise.all(options.outputs.map((value) => generateOutput({ ...options, ...value }, isSingleFormat, isTest, options.sourceMap, options.sourceMapType)));
  return {
    input: path.resolve(options.inputFileDir, options.inputFileName + options.inputFileExt),
    output,
    plugins: options.plugins,
  };
};


function mergeExports(a: DefaultConfigsExports | undefined, b: DefaultConfigsExports): DefaultConfigsExports {
  if (a === undefined) {
    return b;
  }
  let ret = { ...a, ...b };
  ret.terserPlugin = { ...a.terserPlugin, ...b.terserPlugin };
  ret.manageDependenciesPlugin = { ...a.manageDependenciesPlugin, ...b.manageDependenciesPlugin };
  ret.constsPlugin = { ...a.constsPlugin, ...b.constsPlugin };
  ret.jsonPlugin = { ...a.jsonPlugin, ...b.jsonPlugin };
  ret.commonjsPlugin = { ...a.commonjsPlugin, ...b.commonjsPlugin };
  ret.typescriptPlugin = <NoDefaults<RollupTypescriptOptions>>{ ...a.typescriptPlugin, ...b.typescriptPlugin };
  ret.sourceMapsPlugin = { ...a.sourceMapsPlugin, ...b.sourceMapsPlugin };
  ret.nodeResolvePlugin = { ...a.nodeResolvePlugin, ...b.nodeResolvePlugin };
  return ret;
}

export interface PackageJsonType {
  format: OutputFormat;
  packageJsonPath: string;
}

export async function calculatePackageJsonTypes(config?: RollupOptions[]): Promise<PackageJsonType[]> {
  if (config === undefined) throw new Error("Rollup config is Empty");
  let map: Map<string, OutputFormat> = new Map();
  // let packageJson = await getPackageJson();
  // let packageType: OutputFormat = "commonjs";
  // if (packageJson.type === "module") packageType = "es";
  // ToDo: Optimize so package.json files are only created at the necessary levels
  for (let options of config) {
    let outputs = options.output;
    if (outputs === undefined) continue;
    if (!Array.isArray(outputs)) outputs = [outputs];
    for (let output of outputs) {
      if (output.file === undefined) continue;
      let ext = path.extname(output.file);
      if (ext === ".cjs" || ext == ".mjs") continue;
      let dir = path.dirname(output.file);
      let packageJsonPath = path.resolve(dir, "package.json");
      let existing = map.get(packageJsonPath);
      let format: OutputFormat = output.format === "commonjs" ? "commonjs" : "es";
      if (existing === undefined) {
        map.set(packageJsonPath, format);
        continue;
      }
      if (existing !== format) throw new Error(`Output contains a folder with commonjs and esm files (${dir}). Module is not compatible for automatic package.json creation`);
    }
  }
  return [...map.entries()].map(([packageJsonPath, format]) => ({ packageJsonPath, format }));
}

async function findTestFiles(options: DefaultConfigs): Promise<{ [key: string]: DefaultConfigsExports; }> {
  options.inputBasePath = getDefault(options.inputBasePath, "./src/");
  options.testsFolderInBasePath = getDefault(options.testsFolderInBasePath, "tests");
  const testFolder = path.resolve(options.inputBasePath, options.testsFolderInBasePath);
  try {
    const files = await fs.readdir(testFolder);
    const testFiles: { [key: string]: DefaultConfigsExports; } = {};
    await Promise.all(files.map(async (file) => {
      options.testFilePrefix = getDefault(options.testFilePrefix, "test");
      if (!file.startsWith(options.testFilePrefix)) return;
      const ext = path.extname(file).toLocaleLowerCase();
      if ((ext !== ".cts") && (ext !== ".mts")) throw new Error(`Testfile ${file} dose not end with .mjs or .cjs. Extension is needed so ava test-runner runs it in the correct context`);
      const p = path.resolve(testFolder, file);
      const stat = await fs.stat(p);
      if (!stat.isFile()) return;
      options.inputBasePath = getDefault(options.inputBasePath, "./src/");
      options.testsFolderInBasePath = getDefault(options.testsFolderInBasePath, "tests");
      const name = path.join(options.testsFolderInBasePath, path.parse(file).name);
      testFiles[name] = {
        isTest: true,
        inputFileExt: ext,
        singleOutputExt: ext === ".cts" ? ".cjs" : ".mjs",
        blacklistDevDependencies: false,
        externalDependencies: ["ava"],
      };
    }));
    return testFiles;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function makeObjectFromArray(array: string[] | { [key: string]: {}; }): { [key: string]: {}; } {
  if (!Array.isArray(array)) return array;
  return Object.fromEntries(array.map((name) => [name, {}]));
}

async function getBuildTargets(options: DefaultConfigs): Promise<{ [key: string]: DefaultConfigsExports; }> {
  let exports = makeObjectFromArray(await topLevelExports());
  let tests = await findTestFiles(options);
  for (let [key, value] of Object.entries(tests)) {
    if (exports[key] === undefined) exports[key] = {};
    exports[key] = mergeExports(exports[key], value);
  };
  return exports;
}

export async function defaultConfigs(options?: DefaultConfigs): Promise<RollupOptions[]> {
  if (options === undefined) options = {};
  let exports = makeObjectFromArray(options.exports || await getBuildTargets(options));
  let additionalExports = makeObjectFromArray(options.exports || {});
  for (let [key, value] of Object.entries(additionalExports)) {
    if (exports[key] === undefined) exports[key] = {};
    exports[key] = mergeExports(exports[key], value);
  };
  return (await Promise.all(Object.entries(exports).map(([key, value]) => {
    if (options === undefined) options = {};
    options.inputBasePath = getDefault(options.inputBasePath, "./src/");
    return generateExport(key, mergeExports(options, value), options.inputBasePath);
  }))).filter((data): data is RollupOptions => data !== undefined);
}

const PackageEsContent = `{"type":"module"}`;
const PackageCjsContent = `{"type":"commonjs"}`;
export async function build(options?: DefaultConfigs, commandOptions?: CommandOptions) {
  let config = await defaultConfigs(options);
  await run(config, commandOptions);
  let packageLocations = await calculatePackageJsonTypes(config);
  await Promise.all(packageLocations.map((data) => {
    fs.writeFile(data.packageJsonPath, data.format === "es" ? PackageEsContent : PackageCjsContent);
  }));
}

