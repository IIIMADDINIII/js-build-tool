import { type IConfigFile } from "@microsoft/api-extractor";
import * as fs from "fs/promises";
import * as path from "path";
import type { OutputOptions, RollupOptions } from "rollup";
import { apiExtractor } from "../../lateImports.js";
import { runApiExtrator } from "../../tools/apiExtractor.js";
import { getPackageType } from "../../tools/package.js";
import { cwd } from "../../tools/paths.js";
import { runTestFiles } from "../../tools/tests.js";
import { getDefaultConfigOpts, type ConfigOpts, type DefaultConfigOpts, type DefaultExportOpts, type DefaultOutputOpts, type OutputFormat } from "./buildOptions.js";
import { run, type CommandOptions } from "./run.js";

interface PackageJsonType {
  format: OutputFormat;
  packageJsonPath: string;
}

function getRollupOutput(defaultExportOpts: DefaultExportOpts, defaultOutputOpts: DefaultOutputOpts): OutputOptions {
  return {
    file: defaultOutputOpts.file,
    format: defaultOutputOpts.outputFormat,
    sourcemap: defaultExportOpts.sourceMap ? (defaultExportOpts.sourceMapType === "inline" ? "inline" : true) : false,
  };
}

function getRollupOption(defaultExportOpts: DefaultExportOpts): RollupOptions | undefined {
  if (defaultExportOpts.isTest && !defaultExportOpts.buildTest) return undefined;
  return {
    treeshake: defaultExportOpts.treeShakeOptions,
    input: defaultExportOpts.inputFile,
    output: defaultExportOpts.outputs.map((defaultOutputOpts) => getRollupOutput(defaultExportOpts, defaultOutputOpts)),
    plugins: defaultExportOpts.plugins,
  };
};

function getRollupOptions(defaultConfigOpts: DefaultConfigOpts): RollupOptions[] {
  return Object.values(defaultConfigOpts.entryPoints).map(getRollupOption).filter((data): data is RollupOptions => data !== undefined);
}

/**
 * Build the Project with an automatically generated rollup config.
 * Also bundles the declaration files with ApiExtractor and generate necessary package.json with module types.
 * @param configOpts - options on how the rollup config should be generated.
 * @param commandOptions - optional cli flags for rollup.
 * @returns Normalized version of the configOpts.
 * @public
 */
export async function build(configOpts?: ConfigOpts, commandOptions?: CommandOptions): Promise<DefaultConfigOpts> {
  const defaultConfigOpts = await getDefaultConfigOpts(configOpts);
  const rollupOptions = getRollupOptions(defaultConfigOpts);
  await run(rollupOptions, commandOptions);
  await generatePackageJsonFiles(defaultConfigOpts);
  await bundleDeclarations(defaultConfigOpts);
  return defaultConfigOpts;
}

/**
 * Bundles the Declarations of an build and deletes them.
 * @param defaultConfigOpts - Normalized ConfigOptions returned from build.
 * @public
 */
export async function bundleDeclarations(defaultConfigOpts: DefaultConfigOpts): Promise<void> {
  let pathsToRemove: Set<string> = new Set();
  for (let defaultExportOpts of Object.values(defaultConfigOpts.entryPoints)) {
    if (!defaultExportOpts.bundleDeclarations) continue;
    if (!defaultExportOpts.generateDeclaration) continue;
    for (let defaultOutputOpts of defaultExportOpts.outputs) {
      const source = defaultOutputOpts.declarationSource;
      try {
        await fs.stat(source);
      } catch (e) {
        if (typeof e === "object" && e !== null && "code" in e && e.code === "ENOENT") {
          continue;
        }
        throw e;
      }
      const declDir = path.resolve(path.dirname(defaultOutputOpts.file), defaultExportOpts.declarationDir);
      pathsToRemove.add(declDir);
      const apiExtractorConfig: IConfigFile = {
        messages: {
          compilerMessageReporting: { default: { logLevel: (await apiExtractor()).ExtractorLogLevel.Warning } },
          extractorMessageReporting: {
            default: { logLevel: (await apiExtractor()).ExtractorLogLevel.Warning },
            "ae-unresolved-link": { logLevel: (await apiExtractor()).ExtractorLogLevel.None },
          },
          tsdocMessageReporting: {
            default: { logLevel: (await apiExtractor()).ExtractorLogLevel.Warning },
            "tsdoc-undefined-tag": { logLevel: (await apiExtractor()).ExtractorLogLevel.None },
            "tsdoc-escape-right-brace": { logLevel: (await apiExtractor()).ExtractorLogLevel.None },
            "tsdoc-malformed-inline-tag": { logLevel: (await apiExtractor()).ExtractorLogLevel.None },
          },
        },
        mainEntryPointFilePath: source,
        bundledPackages: defaultOutputOpts.bundleDeclarationPackages,
        projectFolder: cwd,
        compiler: {
          tsconfigFilePath: path.resolve(defaultExportOpts.tsconfig),
        },
        dtsRollup: {
          enabled: true,
          untrimmedFilePath: defaultOutputOpts.declarationTarget,
        },
      };
      await runApiExtrator(path.resolve("package.json"), apiExtractorConfig);
    }
  }
  await Promise.all([...pathsToRemove.values()].map(async (path) => fs.rm(path, { recursive: true })));
}

/**
 * Build the Project with an automatically generated rollup config.
 * Also bundles the declaration files with ApiExtractor and generate necessary package.json with module types.
 * Automatically sets the configOpts.buildTest option to true to build the test files.
 * @param configOpts - options on how the rollup config should be generated.
 * @param commandOptions - optional cli flags for rollup.
 * @returns Normalized version of the configOpts.
 * @public
 */
export async function buildWithTests(configOpts?: ConfigOpts, commandOptions?: CommandOptions): Promise<DefaultConfigOpts> {
  return build({ buildTest: true, ...configOpts }, commandOptions);
}

/**
 * Build the Project with an automatically generated rollup config.
 * Also bundles the declaration files with ApiExtractor and generate necessary package.json with module types.
 * Automatically sets the configOpts.buildTest option to true to build the test files.
 * Runs Jest with the generated test files after the build finished.
 * @param configOpts - options on how the rollup config should be generated.
 * @param commandOptions - optional cli flags for rollup.
 * @returns Normalized version of the configOpts.
 * @public
 */
export async function buildAndRunTests(configOpts?: ConfigOpts, commandOptions?: CommandOptions): Promise<DefaultConfigOpts> {
  const defaultConfigOpts = await buildWithTests(configOpts, commandOptions);
  const testFiles = getTestFiles(defaultConfigOpts);
  await runTestFiles(testFiles);
  return defaultConfigOpts;
}

const PackageEsContent = `{"type":"module"}`;
const PackageCjsContent = `{"type":"commonjs"}`;
async function generatePackageJsonFiles(defaultConfigOpts: DefaultConfigOpts): Promise<void> {
  const packageLocations = await calculatePackageJsonTypes(defaultConfigOpts);
  await Promise.all(packageLocations.map((data) => {
    fs.writeFile(data.packageJsonPath, data.format === "es" ? PackageEsContent : PackageCjsContent);
  }));
}

function resolvePath(...filePath: string[]): string {
  return path.resolve(...filePath) + path.sep;
}

async function calculatePackageJsonTypes(defaultConfigOpts: DefaultConfigOpts): Promise<PackageJsonType[]> {
  let dirFormatMap: Map<string, OutputFormat> = new Map();
  const packageType = (await getPackageType()) === "module" ? "es" : "commonjs";
  const mainDir = resolvePath(".");
  dirFormatMap.set(mainDir, packageType);
  for (let defaultExportOpts of Object.values(defaultConfigOpts.entryPoints)) {
    for (let output of defaultExportOpts.outputs) {
      if (output.outputFileExt === ".cjs" || output.outputFileExt == ".mjs") continue;
      const dir = resolvePath(path.dirname(output.file));
      if (!dir.startsWith(mainDir)) continue;
      const existing = dirFormatMap.get(dir);
      if (existing === undefined) {
        dirFormatMap.set(dir, output.outputFormat);
        continue;
      }
      if (existing !== output.outputFormat) throw new Error(`Output contains a folder with commonjs and esm files (${dir}). Module is not compatible for automatic package.json creation`);
    }
  }

  // Duplicate formats to shorter path, when the shorter path does not exist
  for (let [dir, format] of dirFormatMap.entries()) {
    if (dir === mainDir) continue;
    while (true) {
      dir = resolvePath(dir, "..");
      if (dir.length <= mainDir.length) break; if (dirFormatMap.has(dir)) break; const
        sharedPathWithDifferentTypeExists = Array.from(dirFormatMap.entries()).filter(([dirB, formatB]) => (format !==
          formatB) && dirB.startsWith(dir)).length !== 0;
      if (sharedPathWithDifferentTypeExists) break;
      dirFormatMap.set(dir, format);
    }
  }

  // Deduplicate Path wich can be handled by shorter Paths
  const dirs = Array.from(dirFormatMap.entries()).sort((a, b) => b[0].length - a[0].length);
  for (let dirFormat of Array.from(dirs)) {
    const dirA = dirFormat[0];
    const formatA = dirFormat[1];
    if (dirA === mainDir) continue;
    let longestFormat = undefined;
    for (let [dirB, formatB] of dirs) {
      if (dirB === dirA) continue;
      if (dirA.startsWith(dirB)) {
        longestFormat = formatB;
        break;
      }
    }
    if (formatA !== longestFormat) continue;
    dirFormatMap.delete(dirA);
    const delIndex = dirs.indexOf(dirFormat);
    if (delIndex > -1) dirs.splice(delIndex, 1);
  }

  dirFormatMap.delete(mainDir);
  return [...dirFormatMap.entries()].map(([packageJsonPath, format]) => ({
    packageJsonPath:
      path.resolve(packageJsonPath, "package.json"), format
  }));
}

/**
 * Calculates the paths to the generated test files.
 * @param defaultConfigOpts - Normalized ConfigOptions returned from build.
 * @returns An Array of files wich includes the tests.
 * @public
 */
export function getTestFiles(defaultConfigOpts: DefaultConfigOpts): string[] {
  const testFiles: string[] = [];
  for (let defaultExportOpts of Object.values(defaultConfigOpts.entryPoints)) {
    if (!defaultExportOpts.isTest) continue;
    for (let output of defaultExportOpts.outputs) {
      testFiles.push(output.file);
    }
  }
  return testFiles;
}