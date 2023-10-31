
import type { RollupCommonJSOptions } from '@rollup/plugin-commonjs';
import commonjs from "@rollup/plugin-commonjs";
import type { RollupJsonOptions } from "@rollup/plugin-json";
import json from "@rollup/plugin-json";
import { nodeResolve, type RollupNodeResolveOptions } from '@rollup/plugin-node-resolve';
import type { Options as TerserOptions } from "@rollup/plugin-terser";
import terser from "@rollup/plugin-terser";
import type { RollupTypescriptOptions } from "@rollup/plugin-typescript";
import typescript from "@rollup/plugin-typescript";
import fs from "fs/promises";
import path from "path";
import type { Plugin } from "rollup";
import consts from "rollup-plugin-consts";
import type { SourcemapsPluginOptions } from 'rollup-plugin-include-sourcemaps';
import sourceMaps from 'rollup-plugin-include-sourcemaps';
import { isProd } from "../../tools/misc.js";
import { getPackageDependencies, getPackageDevDependencies, getPackageType, topLevelExports } from "../../tools/package.js";
import { manageDependencies, type ManageDependenciesConfig } from "../plugins.js";

export type OutputFormat = "es" | "commonjs";
export type ExecutionEnvironment = "node" | "browser";
export type ExportType = "app" | "lib";
export type SourceMapType = "external" | "inline";
export type ConstsPluginOptions = { [name: string]: any; };

export interface DefaultOutputOpts {
  outputFileDir: string;
  outputFileName: string;
  outputFileExt: string;
  outputFormat: OutputFormat;
  cjsOutputDir: string;
  mjsOutputDir: string;
  singleOutputDir: string;
  cjsOutputExt: string;
  mjsOutputExt: string;
  singleOutputExt: string;
  testOutputDir: string;
  file: string;
}
export interface OutputOpts extends Partial<Omit<DefaultOutputOpts, "outputFileName" | "outputFormat" | "file">> {
  hookOutputOptions?(options: OutputOpts): Promise<OutputOpts | undefined> | OutputOpts | undefined;
  outputFileName: string,
  outputFormat: OutputFormat,
}

export type DefaultOutputsOpts = DefaultOutputOpts[];
export type OutputsOpts = OutputOpts[];

export interface DefaultExportOpts {
  environment: ExecutionEnvironment;
  type: ExportType;
  prod: boolean;
  minify: boolean;
  generateDeclaration: boolean;
  defaultLib: string[];
  browserLib: string[];
  nodeLib: string[];
  tsconfig: string;
  sourceMap: boolean;
  sourceMapType: SourceMapType;
  externalDependencies: string[];
  blacklistDependencies: string[];
  allowedDevDependencies: string[];
  blacklistDevDependencies: boolean;
  defaultExportName: string;
  inputFileDir: string;
  inputFileName: string;
  inputFileExt: string;
  isTest: boolean;
  isSingleFormat: boolean;
  buildTest: boolean;
  outputs: DefaultOutputsOpts;
  plugins: Plugin[];
  terserPlugin: TerserOptions;
  manageDependenciesPlugin: ManageDependenciesConfig;
  constsPlugin: ConstsPluginOptions;
  jsonPlugin: RollupJsonOptions;
  commonjsPlugin: RollupCommonJSOptions;
  typescriptPlugin: RollupTypescriptOptions;
  sourceMapsPlugin: SourcemapsPluginOptions;
  nodeResolvePlugin: RollupNodeResolveOptions;
}
export interface ExportOpts extends Partial<Omit<DefaultExportOpts, "outputs">>, Partial<OutputOpts> {
  hookOptions?(exportName: string, options: ExportOpts): Promise<[string, ExportOpts] | undefined> | [string, ExportOpts] | undefined;
  outputs?: OutputsOpts;
}

export type DefaultExportsOpts = { [key: string]: DefaultExportOpts; };
export type ExportsOpts = string[] | { [key: string]: ExportOpts; };

export interface DefaultConfigOpts {
  testsFolderInBasePath: string;
  testFilePrefix: string;
  inputBasePath: string;
  exports: DefaultExportsOpts;
  tests: DefaultExportsOpts;
  additionalExports: DefaultExportsOpts;
  entryPoints: DefaultExportsOpts;
}
export interface ConfigOpts extends ExportOpts {
  testsFolderInBasePath?: string;
  testFilePrefix?: string;
  inputBasePath?: string;
  exports?: ExportsOpts;
  tests?: ExportsOpts;
  additionalExports?: ExportsOpts;
}

export async function getDefaultConfigOpts(configOpts?: ConfigOpts): Promise<DefaultConfigOpts> {
  if (configOpts === undefined) configOpts = {};
  let defaultConfigOpts: DefaultConfigOpts = {
    inputBasePath: getDefault(configOpts.inputBasePath, "./src/"),
    testsFolderInBasePath: getDefault(configOpts.testsFolderInBasePath, "tests"),
    testFilePrefix: getDefault(configOpts.testFilePrefix, "test"),
    exports: {},
    tests: {},
    additionalExports: {},
    entryPoints: {},
  };
  defaultConfigOpts.exports = await getDefaultExportsOpts(defaultConfigOpts, configOpts, configOpts.exports || await getDefaultExports());
  defaultConfigOpts.tests = await getDefaultExportsOpts(defaultConfigOpts, configOpts, configOpts.tests || await getDefaultTests(defaultConfigOpts));
  defaultConfigOpts.additionalExports = await getDefaultExportsOpts(defaultConfigOpts, configOpts, getDefault(configOpts.additionalExports, {}));
  defaultConfigOpts.entryPoints = { ...defaultConfigOpts.exports, ...defaultConfigOpts.tests, ...defaultConfigOpts.additionalExports };
  return defaultConfigOpts;
}

async function getDefaultExportsOpts(defaultConfigOpts: DefaultConfigOpts, configOpts: ConfigOpts, exportsOpts: ExportsOpts): Promise<DefaultExportsOpts> {
  if (Array.isArray(exportsOpts)) exportsOpts = Object.fromEntries(exportsOpts.map((name) => [name, {}]));
  const promises: Promise<[string, DefaultExportOpts]>[] = [];
  for (let [key, value] of Object.entries(exportsOpts)) {
    promises.push(getDefaultExportOpts(defaultConfigOpts, configOpts, key, value));
  }
  return Object.fromEntries(await Promise.all(promises));
}

async function getDefaultExportOpts(defaultConfigOpts: DefaultConfigOpts, configOpts: ConfigOpts, exportName: string, exportOpts: ExportOpts): Promise<[string, DefaultExportOpts]> {
  exportOpts = { ...configOpts, ...exportOpts };
  [exportName, exportOpts] = await runHookOptions(exportName, exportOpts);
  const isTest = getDefault(exportOpts.isTest, false);
  const environment = getDefault(exportOpts.environment, "node");
  const type = getDefault(exportOpts.type, "lib");
  const prod = isProd();
  const defaultExportName = getDefault(exportOpts.defaultExportName, "index");
  const inputFileName = getDefault(exportOpts.inputFileName, getDefaultFileName(exportName, defaultExportName));
  const inputFileExt = getDefault(exportOpts.inputFileExt, ".ts");
  let defaultExportOpts: DefaultExportOpts = {
    isTest,
    environment,
    type,
    prod,
    minify: getDefault(exportOpts.minify, prod && !isTest),
    defaultExportName,
    inputFileDir: getDefault(exportOpts.inputFileDir, defaultConfigOpts.inputBasePath),
    inputFileName,
    inputFileExt,
    sourceMap: getDefault(exportOpts.sourceMap, !prod || isTest),
    sourceMapType: getDefault(exportOpts.sourceMapType, "external"),
    buildTest: getDefault(exportOpts.buildTest, false),
    terserPlugin: getDefault(exportOpts.terserPlugin, {}),
    externalDependencies: getDefault(exportOpts.externalDependencies, []),
    blacklistDependencies: getDefault(exportOpts.blacklistDependencies, []),
    allowedDevDependencies: getDefault(exportOpts.allowedDevDependencies, []),
    blacklistDevDependencies: getDefault(exportOpts.blacklistDevDependencies, true),
    constsPlugin: getDefault(exportOpts.constsPlugin, { production: prod, development: !prod, testing: isTest }),
    jsonPlugin: getDefault(exportOpts.jsonPlugin, {}),
    commonjsPlugin: getDefault(exportOpts.commonjsPlugin, {}),
    generateDeclaration: getDefault(exportOpts.generateDeclaration, !prod || type === "lib"),
    defaultLib: getDefault(exportOpts.defaultLib, ["ESNext"]),
    browserLib: getDefault(exportOpts.browserLib, ["DOM"]),
    nodeLib: getDefault(exportOpts.nodeLib, []),
    tsconfig: getDefault(exportOpts.tsconfig, isTest ? "./tsconfig.test.json" : "./tsconfig.json"),
    sourceMapsPlugin: getDefault(exportOpts.sourceMapsPlugin, {}),
    nodeResolvePlugin: getDefault(exportOpts.nodeResolvePlugin, getNodeResolveDefaultOptions(environment)),
    manageDependenciesPlugin: {},
    typescriptPlugin: {},
    plugins: [],
    outputs: [],
    isSingleFormat: false,
  };
  defaultExportOpts.manageDependenciesPlugin = getDefault(exportOpts.manageDependenciesPlugin, await getManageDependenciesDefaultOptions(defaultExportOpts));
  defaultExportOpts.typescriptPlugin = getDefault(exportOpts.typescriptPlugin, getTypescriptDefaultOptions(defaultExportOpts));
  defaultExportOpts.plugins = getDefault(exportOpts.plugins, await getDefaultPlugins(defaultExportOpts));
  const outputsOpts = getDefault(exportOpts.outputs, await getDefaultOutputs(inputFileName, inputFileExt));
  defaultExportOpts.isSingleFormat = getDefault(exportOpts.isSingleFormat, countFormats(outputsOpts) === 1);
  defaultExportOpts.outputs = await getDefaultOutputsOpts(defaultExportOpts, exportOpts, outputsOpts);
  return [exportName, defaultExportOpts];
};

async function getDefaultOutputsOpts(defaultExportOpts: DefaultExportOpts, exportOpts: ExportOpts, outputsOpts: OutputsOpts): Promise<DefaultOutputsOpts> {
  return Promise.all(outputsOpts.map((outputOpts) => {
    return getDefaultOutputOpts(defaultExportOpts, exportOpts, outputOpts);
  }));
}

async function getDefaultOutputOpts(defaultExportOpts: DefaultExportOpts, exportOpts: ExportOpts, outputOpts: OutputOpts): Promise<DefaultOutputOpts> {
  outputOpts = { ...exportOpts, ...outputOpts };
  outputOpts = await runHookOutputOptions(outputOpts);
  let defaultOutputOpts: DefaultOutputOpts = {
    outputFileName: outputOpts.outputFileName,
    outputFormat: outputOpts.outputFormat,
    cjsOutputDir: getDefault(outputOpts.cjsOutputDir, "./dist/cjs/"),
    mjsOutputDir: getDefault(outputOpts.mjsOutputDir, "./dist/esm/"),
    singleOutputDir: getDefault(outputOpts.singleOutputDir, "./dist/"),
    cjsOutputExt: getDefault(outputOpts.cjsOutputExt, ".js"),
    mjsOutputExt: getDefault(outputOpts.mjsOutputExt, ".js"),
    singleOutputExt: getDefault(outputOpts.singleOutputExt, ".js"),
    testOutputDir: getDefault(outputOpts.testOutputDir, "./tests/"),
    outputFileDir: "",
    outputFileExt: "",
    file: "",
  };
  if (defaultExportOpts.isTest) {
    defaultOutputOpts.outputFileDir = defaultOutputOpts.testOutputDir;
    defaultOutputOpts.outputFileExt = exportOpts.inputFileExt === ".cts" ? ".cjs" : ".mjs";
  } else if (defaultExportOpts.isSingleFormat) {
    defaultOutputOpts.outputFileDir = defaultOutputOpts.singleOutputDir;
    defaultOutputOpts.outputFileExt = defaultOutputOpts.singleOutputExt;
  } else if (defaultOutputOpts.outputFormat === "es") {
    defaultOutputOpts.outputFileDir = defaultOutputOpts.mjsOutputDir;
    defaultOutputOpts.outputFileExt = defaultOutputOpts.mjsOutputExt;
  } else if (defaultOutputOpts.outputFormat === "commonjs") {
    defaultOutputOpts.outputFileDir = defaultOutputOpts.cjsOutputDir;
    defaultOutputOpts.outputFileExt = defaultOutputOpts.cjsOutputExt;
  } else {
    defaultOutputOpts.outputFileDir = defaultOutputOpts.singleOutputDir;
    defaultOutputOpts.outputFileExt = defaultOutputOpts.singleOutputExt;
  }
  defaultOutputOpts.file = path.resolve(defaultOutputOpts.outputFileDir, defaultOutputOpts.outputFileName + defaultOutputOpts.outputFileExt);
  return defaultOutputOpts;
}

async function getDefaultExports(): Promise<ExportsOpts> {
  return await topLevelExports();
}

async function getDefaultTests(defaultConfigOpts: DefaultConfigOpts): Promise<ExportsOpts> {
  const testFolder = path.resolve(defaultConfigOpts.inputBasePath, defaultConfigOpts.testsFolderInBasePath);
  try {
    const files = await fs.readdir(testFolder);
    const testFiles: ExportsOpts = {};
    await Promise.all(files.map(async (file) => {
      if (!file.startsWith(defaultConfigOpts.testFilePrefix)) return;
      const inputFileExt = path.extname(file).toLocaleLowerCase();
      if ((inputFileExt !== ".cts") && (inputFileExt !== ".mts")) throw new Error(`Testfile ${file} dose not end with .mjs or .cjs. Extension is needed so ava test-runner runs it in the correct context`);
      const p = path.resolve(testFolder, file);
      const stat = await fs.stat(p);
      if (!stat.isFile()) return;
      const name = path.join(defaultConfigOpts.testsFolderInBasePath, path.parse(file).name);
      testFiles[name] = {
        isTest: true,
        inputFileExt,
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

async function getDefaultPlugins(defaultExportOpts: DefaultExportOpts): Promise<Plugin[]> {
  let plugins = [
    manageDependencies(defaultExportOpts.manageDependenciesPlugin),
    consts(defaultExportOpts.constsPlugin),
    json(defaultExportOpts.jsonPlugin),
    commonjs(defaultExportOpts.commonjsPlugin),
    typescript(defaultExportOpts.typescriptPlugin),
    sourceMaps(defaultExportOpts.sourceMapsPlugin),
    nodeResolve(defaultExportOpts.nodeResolvePlugin),
  ];
  if (defaultExportOpts.minify) {
    plugins.push(terser(defaultExportOpts.terserPlugin));
  }
  return plugins;
}

async function getManageDependenciesDefaultOptions(defaultExportOpts: DefaultExportOpts): Promise<ManageDependenciesConfig> {
  let deps = Object.keys(await getPackageDependencies());
  let blacklist = [...defaultExportOpts.blacklistDependencies];
  if (defaultExportOpts.blacklistDevDependencies) {
    let devDeps = new Set(Object.keys(await getPackageDevDependencies()));
    for (let allowed of defaultExportOpts.allowedDevDependencies) {
      devDeps.delete(allowed);
    }
    blacklist.push(...devDeps.values());
  }
  if (defaultExportOpts.type === "lib") {
    return { external: [...defaultExportOpts.externalDependencies, ...deps.values()], blacklist: blacklist };
  } else if (defaultExportOpts.type === "app") {
    return { external: defaultExportOpts.externalDependencies, blacklist: blacklist };
  }
  return {};
}

function getTypescriptDefaultOptions(defaultExportOpts: DefaultExportOpts): RollupTypescriptOptions {
  let lib = [...defaultExportOpts.defaultLib];
  if (defaultExportOpts.environment === "browser") {
    lib.push(...defaultExportOpts.browserLib);
  }
  if (defaultExportOpts.environment === "node") {
    lib.push(...defaultExportOpts.nodeLib);
  }
  let rollupTypescriptOptions: RollupTypescriptOptions = {
    noEmitOnError: true,
    outputToFilesystem: true,
    declaration: defaultExportOpts.generateDeclaration,
    declarationMap: defaultExportOpts.generateDeclaration,
    lib,
    tsconfig: defaultExportOpts.tsconfig,
  };
  if (!defaultExportOpts.sourceMap) {
    rollupTypescriptOptions.sourceMap = false;
    rollupTypescriptOptions.inlineSources = undefined;
  }
  return rollupTypescriptOptions;
}

function getNodeResolveDefaultOptions(environment: ExecutionEnvironment): RollupNodeResolveOptions {
  if (environment === "node") {
    return { browser: false, exportConditions: ["node"] };
  } else if (environment === "browser") {
    return { browser: true };
  }
  return {};
}

async function getDefaultOutputs(name: string, ext: string): Promise<OutputOpts[]> {
  let type = await getPackageType();
  ext = ext.toLocaleLowerCase();
  if (ext === ".mts") {
    return [{
      outputFileName: name,
      outputFormat: "es",
    }];
  }
  if (ext === ".cts") {
    return [{
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

function countFormats(outputs: OutputsOpts): number {
  let formats: Set<string> = new Set();
  for (let out of outputs) {
    formats.add(out.outputFormat);
  }
  return formats.size;
}

function getDefaultFileName(name: string, defaultName: string) {
  if (name.startsWith("./")) name = name.slice(2);
  if (name == ".") name = defaultName;
  return name;
}

async function runHookOptions(exportName: string, options: ExportOpts): Promise<[string, ExportOpts]> {
  if (options.hookOptions) {
    let ret = await options.hookOptions(exportName, options);
    if (ret !== undefined) return ret;
  }
  return [exportName, options];
}

async function runHookOutputOptions(options: OutputOpts): Promise<OutputOpts> {
  if (options.hookOutputOptions) {
    let ret = await options.hookOutputOptions(options);
    if (ret !== undefined) return ret;
  }
  return options;
}

function getDefault<T>(value: T | undefined, def: T): T {
  if (typeof value === "undefined") return def;
  return value;
}