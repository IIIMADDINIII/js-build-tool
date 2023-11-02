
import { createRequire } from "module";
import path from "path";
import { fs } from "./file.js";
import { readPackageJson, type PackageJsonSchema } from "./package.js";
import { binPath, nodeModulesPath } from "./paths.js";

export type StubPackageOptions = {
  name: string;
  location: string;
  resolveFromLocation?: boolean;
  subpaths?: string[];
};

export async function stubPackages(options: StubPackageOptions[]): Promise<void> {
  await Promise.all(options.map(stubPackage));
}

export async function stubPackage(options: StubPackageOptions): Promise<void> {
  const packageJson = await getPackageJson(options);
  const packagePath = path.resolve(nodeModulesPath, options.name);
  try {
    await fs.stat(packagePath);
    return;
  } catch (e) {
    if (typeof e !== "object" || e === null || !("code" in e) || e.code !== "ENOENT") {
      throw e;
    }
  }
  await stubIndexJs(options, packagePath);
  await stubBinScripts(options, packagePath, packageJson);
  await stubPackageJson(packagePath, packageJson);
  await stubSubPaths(options, packagePath);
}

async function stubSubPaths(options: StubPackageOptions, packagePath: string) {
  if (!options.subpaths) return;
  await Promise.all(options.subpaths.map(async (subpath) => {
    const filePath = path.resolve(packagePath, subpath);
    await writeReExportFile(filePath, options, subpath);
  }));
}

async function stubIndexJs(options: StubPackageOptions, packagePath: string) {
  await fs.mkdir(packagePath, { recursive: true });
  const indexFilePath = path.resolve(packagePath, "index.js");
  await writeReExportFile(indexFilePath, options);
}

async function stubBinScripts(options: StubPackageOptions, packagePath: string, packageJson: PackageJsonSchema) {
  let bin = await resolveBinOptions(packageJson);
  await Promise.all([...Object.entries(bin)].map(async ([cmdName, cmdRelPath]) => {
    const cmdPath = path.resolve(packagePath, cmdRelPath).replaceAll("\\", "/");
    let subPath = cmdRelPath;
    if (subPath.startsWith("./")) subPath = subPath.slice(2);
    await writeReExportFile(cmdPath, options, subPath);
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

export async function writeReExportFile(filePath: string, options: StubPackageOptions, subPath: string = "") {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (options.resolveFromLocation) {
    const targetLocation = path.resolve(options.location).replaceAll("\\", "/");
    if (subPath !== "") subPath = "/" + subPath;
    return await fs.writeFile(filePath, `module.exports = require("module").createRequire("${targetLocation}")(${options.name})`);
  }
  const targetLocation = path.resolve(options.location, subPath).replaceAll("\\", "/");
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

async function getPackageJson(options: StubPackageOptions): Promise<PackageJsonSchema> {
  let packagePath = path.resolve(options.location, "package.json");
  if (options.resolveFromLocation) {
    packagePath = createRequire(options.location).resolve(options.name + "/package.json");
  }
  return await readPackageJson(packagePath);
}