
import commonjs, { type RollupCommonJSOptions } from "@rollup/plugin-commonjs";
import json, { type RollupJsonOptions } from "@rollup/plugin-json";
import { nodeResolve, type RollupNodeResolveOptions } from '@rollup/plugin-node-resolve';
import terser, { type Options as TerserOptions } from "@rollup/plugin-terser";
import typescript, { type RollupTypescriptOptions } from "@rollup/plugin-typescript";
import fastGlob from "fast-glob";
import path from "path";
import type { Plugin } from "rollup";
import consts from "rollup-plugin-consts";
import sourceMaps, { type SourcemapsPluginOptions } from 'rollup-plugin-include-sourcemaps';
import { fs } from "../../tools/file.js";
import { getDependencies, getDevDependencies, getPackageType, getTopLevelExports } from "../../tools/package.js";
import { isProd } from "../../tools/prod.js";
import { manageDependencies, type ManageDependenciesConfig } from "../plugins.js";

/**
 * Output format for a bundle:
 * "es" = ECMAScript Module syntax (mjs).
 * "commonjs" = CommonJs Module Syntax (cjs).
 * @public
 */
export type OutputFormat = "es" | "commonjs";
/**
 * Where dose this code execute:
 * "node" = Code is Executed by Node or similar environment.
 * "browser" = Code is Executed by a Browser.
 * @public
 */
export type ExecutionEnvironment = "node" | "browser";
/**
 * What type of package is compiled:
 * "app" = A standalone Application. It will be distributed as a whole (dependencies are bundled).
 * "lib" = A library wich will be eventually be used by an Application (dependencies are not bundled).
 * @public
 */
export type ExportType = "app" | "lib";
/**
 * How should the sourcemap be generated:
 * "external" = A separate file with the Sourcemap is emitted.
 * "inline" = The sourcemap is inlined in to the bundle.
 * @public
 */
export type SourceMapType = "external" | "inline";
/**
 * Options for the Consts Rollup Plugin.
 * @see {@link https://www.npmjs.com/package/rollup-plugin-consts | rollup-plugin-consts}
 * @public
 */
export type ConstsPluginOptions = { [name: string]: any; };

/**
 * Options on how a Bundle was emitted.
 * @public
 */
export interface DefaultOutputOpts {
  /**
   * The base path directory where this output should be generated.
   * By default it will use one of the cjsOutputDir, mjsOutputDir, singleOutputDir, testOutputDir values.
   */
  outputFileDir: string;
  /**
   * Path of the file relative to the base path.
   */
  outputFileName: string;
  /**
   * The File extension to use when emitting the bundle.
   * By default it will use one of the cjsOutputExt, mjsOutputExt, singleOutputExt values.
   * Testfiles will use .cjs ode .mjs based on the input file extension.
   * Is the input file used .mts or .mjs it will take precedence over all other rules.
   */
  outputFileExt: string;
  /**
   * Output format of this Bundle.
   * If the Output Options are generated automatically, it will analyse the package.json type field and use that format.
   * If the type field is undefined, it will generate both es and commonjs.
   * .cts or .mts extensions take precedence over the package.json type field.
   */
  outputFormat: OutputFormat;
  /**
   * The base path directory if multiple outputFormats are present and the format is commonjs.
   * @default "./dist/cjs/"
   */
  cjsOutputDir: string;
  /**
   * The base path directory if multiple outputFormats are present and the format is es.
   * @default "./dist/esm/"
   */
  mjsOutputDir: string;
  /**
   * The base path directory if only one outputFormat is present.
   * @default "./dist/"
   */
  singleOutputDir: string;
  /**
   * Extension of the output file if multiple outputFormats a present and the format is commonjs.
   * @default ".js"
   */
  cjsOutputExt: string;
  /**
   * Extension of the output file if multiple outputFormats a present and the format is es.
   * @default ".js"
   */
  mjsOutputExt: string;
  /**
   * Extension of the output file to be used, when only a single outputFormat is used.
   * @default ".js"
   */
  singleOutputExt: string;
  /**
   * The base path directory for tests to be emitted.
   * @default "./tests/"
   */
  testOutputDir: string;
  /**
   * Filepath to the generated output.
   */
  file: string;
  /**
   * File path where the bundled declarations should be emitted.
   */
  declarationTarget: string;
  /**
   * Current location of the unbundled declaration file associated with this output.
   */
  declarationSource: string;
  /**
   * A list of packages wich should also be bundled in the declarations.
   * @default []
   */
  bundleDeclarationPackages: string[];
}

/**
 * Options for how to generate 
 * @public
 */
export interface OutputOpts extends Partial<Omit<DefaultOutputOpts, "outputFileName" | "outputFormat" | "file" | "declarationTarget" | "declarationSource">> {
  /**
   * An callback function wich is called for each Output.
   * Used to modify the Output Options before the config is normalized.
   * If it returns undefined the output options are not changed.
   * @param options - the options for the current output
   * @returns the New Output Options wich should be used or undefined. Can return a Promise.
   */
  hookOutputOptions?(options: OutputOpts): Promise<OutputOpts | undefined> | OutputOpts | undefined;
  /**
   * The file name of the generated bundle.
   */
  outputFileName: string,
  /**
   * What format the output should be (es or commenjs).
   */
  outputFormat: OutputFormat,
}

/**
 * An Array of OutputOpts each defining an bundle wich was emitted.
 * @public
 */
export type DefaultOutputsOpts = DefaultOutputOpts[];

/**
 * An Array of OutputOpts each defining an bundle wich should be emitted.
 * @public
 */
export type OutputsOpts = OutputOpts[];

/**
 * Normalized Information on how an entrypoint was generated.
 * @public
 */
export interface DefaultExportOpts {
  /**
   * Where dose this code execute:
   * "node" = Code is Executed by Node or similar environment.
   * "browser" = Code is Executed by a Browser.
   * @default "node"
   */
  environment: ExecutionEnvironment;
  /**
   * What type of package is compiled:
   * "app" = A standalone Application. It will be distributed as a whole (dependencies are bundled).
   * "lib" = A library wich will be eventually be used by an Application (dependencies are not bundled).
   * @default "lib"
   */
  type: ExportType;
  /**
   * Is it in Production?
   */
  prod: boolean;
  /**
   * Should the bundle be minified with terser?
   * By default only Production Builds except test files are minified.
   */
  minify: boolean;
  /**
   * Should declarations be generated?
   * For Testfiles declarations are not generated, by default.
   * If it is a library (type==="lib") or not in Production, declaration will be generated by default.
   */
  generateDeclaration: boolean;
  /**
   * The directory where declarations should be emitted.
   * @default "decl"
   */
  declarationDir: string;
  /**
   * Should the declarations of this entrypoint be bundled?
   * @default true
   */
  bundleDeclarations: boolean;
  /**
   * Typescript Libraries to be used in all Projects.
   * @default ["ESNext"]
   */
  defaultLib: string[];
  /**
   * Typescript Libraries to be used with Browser Projects.
   * @default ["DOM"]
   */
  browserLib: string[];
  /**
   * Typescript Libraries to be used with Node Projects.
   * @default []
   */
  nodeLib: string[];
  /**
   * TsConfig file to be used with this export.
   * @default "./tsconfig.json"
   */
  tsconfig: string;
  /**
   * The outDir typescript option.
   * By Default it will use the "./dist/" folder.
   * If it is a test it will use the "./tests/" folder.
   */
  tsOutDir: string;
  /**
   * Tsbuildinfo filename for this entrypoint.
   * needs to be different for each entrypoint else incremental builds don't work.
   * By default it is generated based on inputFileName.
   */
  tsBuildInfoFileName: string;
  /**
   * Should sourcemaps be generated?
   * By default sourcemaps are generated when not in Production (CI) or if it is a test.
   */
  sourceMap: boolean;
  /**
   * How should the sourcemap be generated:
   * "external" = A separate file with the Sourcemap is emitted (default).
   * "inline" = The sourcemap is inlined in to the bundle (default for tests only).
   */
  sourceMapType: SourceMapType;
  /**
   * Additional dependencies wich should not be bundled (External dependencies).
   * @default []
   */
  externalDependencies: string[];
  /**
   * Additional packages wich should be blacklisted.
   * @default []
   */
  blacklistDependencies: string[];
  /**
   * Dev Dependencies wich are allowed even when blacklisting is on.
   * @default []
   */
  allowedDevDependencies: string[];
  /**
   * Dev Dependencies wich are allowed in test files.
   * @default ["\@jest/globals"]
   */
  testDependencies: string[];
  /**
   * Should the build fail, if dev dependencies are referenced in the bundle.
   * @default true
   */
  blacklistDevDependencies: boolean;
  /**
   * Filename to be used for the default export ".".
   * @default "index"
   */
  defaultExportName: string;
  /**
   * Base path of the source file.
   * Will be the value of {@link ConfigOpts.inputBasePath} by default.
   */
  inputFileDir: string;
  /**
   * Filepath of the sourcefile relative to the base path.
   * By default it will use the path specified in the exports field in Package.json.
   */
  inputFileName: string;
  /**
   * File extension of the source file.
   * By default it will try to load .cts and .mts files first.
   * If these files don't exist, it will use .ts
   */
  inputFileExt: string;
  /**
   * Filepath to the entrypoint source.
   */
  inputFile: string;
  /**
   * If true, this is an entrypoint to a test file.
   * @default false
   */
  isTest: boolean;
  /**
   * Overrides the automatic detection if this entrypoint has multiple outputFormats.
   */
  isSingleFormat: boolean;
  /**
   * Defines if testfiles should be build.
   * @default false
   */
  buildTest: boolean;
  /**
   * An Array of DefaultOutputsOpts each defining an bundle wich was emitted.
   */
  outputs: DefaultOutputsOpts;
  /**
   * Overrides the array of Rollup Plugins to be used.
   */
  plugins: Plugin[];
  /**
   * Overrides the Options of the terser plugin.
   * @see {@link https://www.npmjs.com/package/@rollup/plugin-terser | @rollup/plugin-terser}
   * @default {}
   */
  terserPlugin: TerserOptions;
  /**
   * Overrides the Options of the manage dependencies plugin.
   * @see {@link manageDependencies}
   */
  manageDependenciesPlugin: ManageDependenciesConfig;
  /**
   * Overrides the Options of the consts plugin.
   * @see {@link https://www.npmjs.com/package/rollup-plugin-consts | rollup-plugin-consts}
   */
  constsPlugin: ConstsPluginOptions;
  /**
   * Overrides the Options of the json plugin.
   * @see {@link https://www.npmjs.com/package/@rollup/plugin-json | @rollup/plugin-json}
   * @default {}
   */
  jsonPlugin: RollupJsonOptions;
  /**
   * Overrides the Options of the commonjs plugin.
   * @see {@link https://www.npmjs.com/package/@rollup/plugin-commonjs | @rollup/plugin-commonjs}
   * @default {}
   */
  commonjsPlugin: RollupCommonJSOptions;
  /**
   * Overrides the Options of the typescript plugin.
   * @see {@link https://www.npmjs.com/package/@rollup/plugin-typescript | @rollup/plugin-typescript}
   */
  typescriptPlugin: RollupTypescriptOptions;
  /**
   * Overrides the Options of the source Maps plugin.
   * @see {@link https://www.npmjs.com/package/rollup-plugin-include-sourcemaps | rollup-plugin-include-sourcemaps}
   * @default {}
   */
  sourceMapsPlugin: SourcemapsPluginOptions;
  /**
   * Overrides the Options of the node resolve plugin.
   * @see {@link https://www.npmjs.com/package/@rollup/plugin-node-resolve | @rollup/plugin-node-resolve}
   */
  nodeResolvePlugin: RollupNodeResolveOptions;
}

/**
 * Options on how to generate an entrypoint.
 * @public
 */
export interface ExportOpts extends Partial<Omit<DefaultExportOpts, "outputs" | "inputFile" | "prod">>, Partial<OutputOpts> {
  /**
   * An callback function wich is called for each Entrypoint.
   * Used to modify the Entrypoint Options and name before the config is normalized.
   * If it returns undefined the entrypoint options are not changed.
   * @param exportName - the Name of the Entrypoint
   * @param options - the options for the current entrypoint
   * @returns the New Entrypoint Options wich should be used or undefined. Can return a Promise.
   */
  hookOptions?(exportName: string, options: ExportOpts): Promise<[string, ExportOpts] | undefined> | [string, ExportOpts] | undefined;
  /**
   * An Array of OutputOpts each defining an bundle to emit.
   * Overrides the default outputs wich are generated.
   * by default it will analyse the package.json type field and use that format.
   * If the type field is undefined, it will generate both es and commonjs.
   * .cts or .mts extensions take precedence over the package.json type field.
   */
  outputs?: OutputsOpts;
}

/**
 * A normalized Map of entrypoints with its build options.
 * @public
 */
export type DefaultExportsOpts = { [key: string]: DefaultExportOpts; };

/**
 * A string[] or Map with Options with entrypoints.
 * @public
 */
export type ExportsOpts = string[] | { [key: string]: ExportOpts; };

/**
 * Normalized version of the ConfigOpts.
 * Defines how the Rollup Config was generated.
 * @public
 */
export interface DefaultConfigOpts {
  /**
   * A Glob Pattern defining wich files are Testfiles.
   */
  testFileGlobPatterns: string[];
  /**
   * BasePath of all source files.
   */
  inputBasePath: string;
  /**
   * A Map of all automatically generated entrypoints to the application with its build options.
   */
  exports: DefaultExportsOpts;
  /**
   * A Map of all testfiles with its build options.
   */
  tests: DefaultExportsOpts;
  /**
   * A Map of all entrypoints wich were added manually with its build options.
   */
  additionalExports: DefaultExportsOpts;
  /**
   * A Merged map of exports, tests and tests.
   */
  entryPoints: DefaultExportsOpts;
}

/**
 * Configuration Options on how to generate an Rollup Config.
 * @public
 */
export interface ConfigOpts extends ExportOpts {
  /**
   * A Glob Pattern defining wich files are Testfiles.
   * @default "**\/*.test.?ts"
   */
  testFileGlobPatterns?: string | string[];
  /**
   * BasePath of all source files (default = "./src/").
   * @default "./src/"
   */
  inputBasePath?: string;
  /**
   * A string[] or Map with Options overriding the automatically generated exports list.
   * By default the exports of the package.json file are analyzed.
   * @example 
   * <caption>example content of an package.json exports field:</caption>
   * ```
   * "exports": {
   *   "./cli": {
   *     "require": {
   *       "types": "./dist/cli.d.cts",
   *       "default": "./dist/cli.cjs"
   *     }
   *   },
   *   ".": {
   *     "import": {
   *       "types": "./dist/index.d.ts",
   *       "default": "./dist/index.js"
   *     }
   *   }
   * },
   * ```
   */
  exports?: ExportsOpts;
  /**
   * A string[] or Map with Options overriding the automatically testfile list.
   * By default all files wich match testFileGlobPatterns are added as tests.
   */
  tests?: ExportsOpts;
  /**
   * A string[] or Map with Options with additional exports added manually.
   * By default this list is empty.
   */
  additionalExports?: ExportsOpts;
}

function makeArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) return input;
  return [input];
}

export async function getDefaultConfigOpts(configOpts?: ConfigOpts): Promise<DefaultConfigOpts> {
  if (configOpts === undefined) configOpts = {};
  let defaultConfigOpts: DefaultConfigOpts = {
    testFileGlobPatterns: makeArray(getDefault(configOpts.testFileGlobPatterns, "**/*.test.?ts")),
    inputBasePath: getDefault(configOpts.inputBasePath, "./src/"),
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
  const inputFileDir = getDefault(exportOpts.inputFileDir, defaultConfigOpts.inputBasePath);
  const inputFileExt = getDefault(exportOpts.inputFileExt, await getDefaultInputFileExt(inputFileDir, inputFileName));
  let defaultExportOpts: DefaultExportOpts = {
    isTest,
    environment,
    type,
    prod,
    minify: getDefault(exportOpts.minify, prod && !isTest),
    defaultExportName,
    inputFileDir,
    inputFileName,
    inputFileExt,
    inputFile: path.resolve(inputFileDir, inputFileName + inputFileExt),
    sourceMap: getDefault(exportOpts.sourceMap, !prod || isTest),
    sourceMapType: getDefault(exportOpts.sourceMapType, isTest ? "inline" : "external"),
    buildTest: getDefault(exportOpts.buildTest, false),
    terserPlugin: getDefault(exportOpts.terserPlugin, {}),
    externalDependencies: getDefault(exportOpts.externalDependencies, []),
    blacklistDependencies: getDefault(exportOpts.blacklistDependencies, []),
    allowedDevDependencies: getDefault(exportOpts.allowedDevDependencies, []),
    testDependencies: getDefault(exportOpts.testDependencies, ["@jest/globals"]),
    blacklistDevDependencies: getDefault(exportOpts.blacklistDevDependencies, true),
    constsPlugin: getDefault(exportOpts.constsPlugin, { production: prod, development: !prod, testing: isTest }),
    jsonPlugin: getDefault(exportOpts.jsonPlugin, {}),
    commonjsPlugin: getDefault(exportOpts.commonjsPlugin, {}),
    generateDeclaration: getDefault(exportOpts.generateDeclaration, (!prod || type === "lib") && !isTest),
    bundleDeclarations: getDefault(exportOpts.bundleDeclarations, true),
    declarationDir: getDefault(exportOpts.declarationDir, "decl"),
    defaultLib: getDefault(exportOpts.defaultLib, ["ESNext"]),
    browserLib: getDefault(exportOpts.browserLib, ["DOM"]),
    nodeLib: getDefault(exportOpts.nodeLib, []),
    tsconfig: getDefault(exportOpts.tsconfig, "./tsconfig.json"),
    tsOutDir: getDefault(exportOpts.tsOutDir, isTest ? "./tests/" : "./dist/"),
    tsBuildInfoFileName: getDefault(exportOpts.tsBuildInfoFileName, inputFileName.replaceAll(/[\/\\]/g, "+") + ".tsbuildinfo"),
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
    bundleDeclarationPackages: getDefault(outputOpts.bundleDeclarationPackages, []),
    outputFileDir: "",
    outputFileExt: "",
    file: "",
    declarationSource: "",
    declarationTarget: "",
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
  if (defaultExportOpts.inputFileExt === ".cts") defaultOutputOpts.outputFileExt = ".cjs";
  if (defaultExportOpts.inputFileExt === ".mts") defaultOutputOpts.outputFileExt = ".mjs";
  defaultOutputOpts.file = path.resolve(defaultOutputOpts.outputFileDir, defaultOutputOpts.outputFileName + defaultOutputOpts.outputFileExt);
  defaultOutputOpts.declarationSource = path.resolve(path.dirname(defaultOutputOpts.file), defaultExportOpts.declarationDir, defaultOutputOpts.outputFileName + ".d" + defaultExportOpts.inputFileExt);
  defaultOutputOpts.declarationTarget = path.resolve(defaultOutputOpts.outputFileDir, defaultOutputOpts.outputFileName + ".d" + defaultExportOpts.inputFileExt);
  return defaultOutputOpts;
}

async function getDefaultExports(): Promise<ExportsOpts> {
  return await getTopLevelExports();
}

async function getDefaultTests(defaultConfigOpts: DefaultConfigOpts): Promise<ExportsOpts> {
  const searchPath = path.resolve(defaultConfigOpts.inputBasePath);
  const files = await fastGlob(defaultConfigOpts.testFileGlobPatterns, { cwd: searchPath });
  const testFiles: ExportsOpts = {};
  await Promise.all(files.map(async (file) => {
    const inputFileExt = path.extname(file).toLocaleLowerCase();
    if ((inputFileExt !== ".cts") && (inputFileExt !== ".mts")) throw new Error(`Testfile ${file} dose not end with .mjs or .cjs. Extension is needed so ava test-runner runs it in the correct context`);
    const p = path.resolve(searchPath, file);
    const stat = await fs.stat(p);
    if (!stat.isFile()) return;
    const name = path.join(path.dirname(file), path.parse(file).name);
    testFiles[name] = {
      isTest: true,
      inputFileExt,
    };
  }));
  return testFiles;
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
  let deps = Object.keys(await getDependencies());
  let blacklist = [...defaultExportOpts.blacklistDependencies];
  if (defaultExportOpts.blacklistDevDependencies) {
    let devDeps = new Set(Object.keys(await getDevDependencies()));
    for (let allowed of defaultExportOpts.allowedDevDependencies) {
      devDeps.delete(allowed);
    }
    if (defaultExportOpts.isTest) {
      for (let allowed of defaultExportOpts.testDependencies) {
        devDeps.delete(allowed);
      }
    }
    blacklist.push(...devDeps.values());
  }
  let external = defaultExportOpts.externalDependencies;
  if (defaultExportOpts.type === "lib") external.push(...deps.values());
  if (defaultExportOpts.isTest) external.push(...defaultExportOpts.testDependencies);
  return { external, blacklist };
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
    tsBuildInfoFile: defaultExportOpts.tsBuildInfoFileName,
    outDir: defaultExportOpts.tsOutDir,
  };
  if (defaultExportOpts.generateDeclaration) {
    rollupTypescriptOptions.declarationDir = defaultExportOpts.declarationDir;
  }
  if (!defaultExportOpts.sourceMap) {
    rollupTypescriptOptions.sourceMap = false;
    (<undefined>rollupTypescriptOptions.inlineSources) = undefined;
  }
  return rollupTypescriptOptions;
}

function getNodeResolveDefaultOptions(environment: ExecutionEnvironment): RollupNodeResolveOptions {
  if (environment === "node") {
    return { browser: false, exportConditions: ["node"], preferBuiltins: true };
  } else if (environment === "browser") {
    return { browser: true };
  }
  return {};
}

async function getDefaultInputFileExt(inputFileDir: string, inputFileName: string): Promise<string> {
  try {
    await fs.stat(path.resolve(inputFileDir, inputFileName + ".cts"));
    return ".cts";
  } catch { }
  try {
    await fs.stat(path.resolve(inputFileDir, inputFileName + ".mts"));
    return ".mts";
  } catch { }
  return ".ts";
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