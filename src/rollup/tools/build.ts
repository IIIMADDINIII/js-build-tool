import * as fs from "fs/promises";
import * as path from "path";
import type { OutputOptions, RollupOptions } from "rollup";
import { runApiExtrator } from "../../tools/apiExtractor.js";
import { cwd, runTestFiles } from "../../tools/misc.js";
import { ConfigOpts, DefaultConfigOpts, DefaultExportOpts, DefaultOutputOpts, OutputFormat, getDefaultConfigOpts } from "./buildOptions.js";
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
    input: path.resolve(defaultExportOpts.inputFileDir, defaultExportOpts.inputFileName + defaultExportOpts.inputFileExt),
    output: defaultExportOpts.outputs.map((defaultOutputOpts) => getRollupOutput(defaultExportOpts, defaultOutputOpts)),
    plugins: defaultExportOpts.plugins,
  };
};

function getRollupOptions(defaultConfigOpts: DefaultConfigOpts): RollupOptions[] {
  return Object.values(defaultConfigOpts.entryPoints).map(getRollupOption).filter((data): data is RollupOptions => data !== undefined);
}

export async function build(configOpts?: ConfigOpts, commandOptions?: CommandOptions): Promise<DefaultConfigOpts> {
  const defaultConfigOpts = await getDefaultConfigOpts(configOpts);
  const rollupOptions = getRollupOptions(defaultConfigOpts);
  await run(rollupOptions, commandOptions);
  await generatePackageJsonFiles(defaultConfigOpts);
  await bundleDeclarations(defaultConfigOpts);
  return defaultConfigOpts;
}

export async function bundleDeclarations(defaultConfigOpts: DefaultConfigOpts): Promise<void> {
  let pathsToRemove: Set<string> = new Set();
  for (let defaultExportOpts of Object.values(defaultConfigOpts.entryPoints)) {
    if (!defaultExportOpts.generateDeclaration) continue;
    for (let defaultOutputOpts of defaultExportOpts.outputs) {
      const source = defaultOutputOpts.declarationSource;
      console.log("source", source);
      try {
        await fs.stat(source);
      } catch (e) {
        if (typeof e === "object" && e !== null && "code" in e && e.code === "ENOENT") {
          continue;
        }
        throw e;
      }
      const declDir = path.resolve(defaultOutputOpts.outputFileDir, defaultExportOpts.declarationDir);
      console.log("pathsToRemove", declDir);
      pathsToRemove.add(declDir);
      const apiExtractorConfig = {
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
      console.log("apiExtractorConfig", apiExtractorConfig);
      runApiExtrator(path.resolve("package.json"), apiExtractorConfig);
    }
  }
  await Promise.all([...pathsToRemove.values()].map(async (path) => fs.rm(path, { recursive: true })));
}

export async function buildWithTests(configOpts?: ConfigOpts, commandOptions?: CommandOptions): Promise<DefaultConfigOpts> {
  return build({ buildTest: true, ...configOpts }, commandOptions);
}

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
  const packageType = "module" === "module" ? "es" : "commonjs";
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