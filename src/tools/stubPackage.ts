
import { createRequire } from "module";
import path from "path";
import { fs } from "./file.js";
import { readPackageJson, type PackageJsonSchema } from "./package.js";
import { binPath, dlxPath, nodeModulesPath, projectNodeModulesPath } from "./paths.js";


/**
 * Resolves the absolute filepath of a module.
 * @param module - name of the module to resolve.
 * @returns 
 * @public
 */
export function resolveModule(module: string): string {
  return createRequire(path.resolve(dlxPath, "package.json")).resolve(module);
}

/**
 * Options to create a stubPackage.
 * @public
 */
export type StubPackageOptions = {
  /**
   * Name of the package which is the destination of the stubPackage.
   */
  name: string;
  /**
   * Normally the package is resolved when the stubPackage is created.
   * Set this to true do delay the resolving of the package to the time of requiring the stub.
   */
  resolveFromLocation?: boolean;
  /**
   * Subpath to also stub in the stubPackage.
   */
  subpaths?: string[];
};

/**
 * Create multiple stubPackages in the temporary directory of the dlx operation.
 * @param options - array of options for how to create the stubPackage.
 * @param location - path of the node_modules folder where the Packages can be found (default = node_modules folder of the project).
 * @public
 */
export async function stubPackages(options: StubPackageOptions[], location: string = projectNodeModulesPath): Promise<void> {
  await Promise.all(options.map((opt) => stubPackage(opt, location)));
}

/**
 * Create a stubPackages in the temporary directory of the dlx operation.
 * @param options - options for how to create the stubPackage.
 * @param location - path of the node_modules folder where the Packages can be found (default = node_modules folder of the project).
 * @public
 */
export async function stubPackage(options: StubPackageOptions, location: string = projectNodeModulesPath): Promise<void> {
  const packageJson = await getPackageJson(options, location);
  const packagePath = path.resolve(nodeModulesPath, options.name);
  try {
    await fs.stat(packagePath);
    return;
  } catch (e) {
    if (typeof e !== "object" || e === null || !("code" in e) || e.code !== "ENOENT") {
      throw e;
    }
  }
  await stubIndexJs(options, packagePath, location);
  await stubBinScripts(options, packagePath, packageJson, location);
  await stubPackageJson(packagePath, packageJson);
  await stubSubPaths(options, packagePath, location);
}

async function stubSubPaths(options: StubPackageOptions, packagePath: string, location: string) {
  if (!options.subpaths) return;
  await Promise.all(options.subpaths.map(async (subpath) => {
    const filePath = path.resolve(packagePath, subpath);
    await writeReExportFile(filePath, options, location, subpath);
  }));
}

async function stubIndexJs(options: StubPackageOptions, packagePath: string, location: string) {
  await fs.mkdir(packagePath, { recursive: true });
  const indexFilePath = path.resolve(packagePath, "index.js");
  await writeReExportFile(indexFilePath, options, location);
}

async function stubBinScripts(options: StubPackageOptions, packagePath: string, packageJson: PackageJsonSchema, location: string) {
  let bin = await resolveBinOptions(packageJson);
  await Promise.all([...Object.entries(bin)].map(async ([cmdName, cmdRelPath]) => {
    const cmdPath = path.resolve(packagePath, cmdRelPath).replaceAll("\\", "/");
    let subPath = cmdRelPath;
    if (subPath.startsWith("./")) subPath = subPath.slice(2);
    await writeReExportFile(cmdPath, options, location, subPath);
    await writeShFile(cmdName, cmdPath);
    await writeCmdFile(cmdName, cmdPath);
    await writePs1File(cmdName, cmdPath);
  }));
}

async function stubPackageJson(packagePath: string, packageJson: PackageJsonSchema) {
  const packageJsonPath = path.resolve(packagePath, "package.json");
  const json = {
    name: packageJson.name,
    version: packageJson.version,
    main: "index.js",
  };
  await fs.writeFile(packageJsonPath, JSON.stringify(json), { flag: "wx" });
}

async function writeReExportFile(filePath: string, options: StubPackageOptions, location: string, subPath: string = "") {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (options.resolveFromLocation) {
    const targetLocation = path.resolve(location).replaceAll("\\", "/");
    if (subPath !== "") subPath = "/" + subPath;
    return await fs.writeFile(filePath, `module.exports = require("module").createRequire("${targetLocation}")(${options.name})`);
  }
  const targetLocation = path.resolve(location, options.name, subPath).replaceAll("\\", "/");
  return await fs.writeFile(filePath, `module.exports = require("${targetLocation}");`);
}

async function writeShFile(cmdName: string, cmdPath: string) {
  const binFile = path.resolve(binPath, cmdName);
  try {
    await fs.writeFile(binFile, `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")

case \`uname\` in
    *CYGWIN*) basedir=\`cygpath - w "$basedir"\`;;
esac

if [ -x "$basedir/node" ]; then
  exec "$basedir/node"  "${cmdPath}" "$@"
else
  exec node  "${cmdPath}" "$@"
fi`, { flag: "wx" });
  } catch { }
}

async function writeCmdFile(cmdName: string, cmdPath: string) {
  const binFile = path.resolve(binPath, cmdName + ".CMD");
  try {
    await fs.writeFile(binFile, `@SETLOCAL
@IF EXIST "%~dp0\\node.exe" (
  "%~dp0\\node.exe"  "${cmdPath}" %*
) ELSE (
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "${cmdPath}" %*
)`, { flag: "wx" });
  } catch { }
}

async function writePs1File(cmdName: string, cmdPath: string) {
  const binFile = path.resolve(binPath, cmdName + ".ps1");
  try {
    await fs.writeFile(binFile, `#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
$pathsep=":"
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
  $pathsep=";"
}

$ret=0
if (Test-Path "$basedir/node$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir/node$exe"  "${cmdPath}" $args
  } else {
    & "$basedir/node$exe"  "${cmdPath}" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "node$exe"  "${cmdPath}" $args
  } else {
    & "node$exe"  "${cmdPath}" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret`, { flag: "wx" });
  } catch { }
}

async function resolveBinOptions(packageJson: PackageJsonSchema): Promise<{ [name: string]: string; }> {
  let bin = packageJson.bin;
  if (bin === undefined) return {};
  if (typeof bin === "string") {
    let name = packageJson.name;
    if (name === undefined) return {};
    name = name.split("/").at(-1);
    if (name === undefined) return {};
    return { [name]: bin };
  }
  return Object.fromEntries([...Object.entries(bin)].filter((data): data is [string, string] => typeof data[1] === "string"));
}

async function getPackageJson(options: StubPackageOptions, location: string): Promise<PackageJsonSchema> {
  if (options.resolveFromLocation) {
    const packagePath = createRequire(location).resolve(options.name + "/package.json");
    return await readPackageJson(packagePath);
  }
  const packagePath = path.resolve(location, options.name, "package.json");
  return await readPackageJson(packagePath);

}