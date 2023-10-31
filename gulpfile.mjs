import * as fs from "fs/promises";
import { rimraf } from "rimraf";
import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";
import { join, parse, resolve } from "path";

const allowedBinNames = ["gulp"];
const filterBasePrefix = ["license", "completion.sh", ".", "authors", "changelog", "changes", "makefile"];
const filterBaseSuffix = [".md", ".yaml", ".map", ".ts", ".mts", ".cts", ".yml", ".txt", ".html", ".coffee", ".markdown", ".tsbuildinfo"];
const filterDirIncludes = [join("node_modules", "@types")];

/***
 * @param {import("path").ParsedPath} parsedPath 
 * @param {string} path 
 */
function shouldDelete(parsedPath, path) {
  const base = parsedPath.base.toLocaleLowerCase();
  const dir = parsedPath.dir.toLocaleLowerCase();
  if (filterBasePrefix.some((prefix) => base.startsWith(prefix))) return true;
  if (filterBaseSuffix.some((suffix) => base.endsWith(suffix))) return true;
  if (filterDirIncludes.some((infix) => dir.includes(infix))) return true;
  if (dir.endsWith(".bin") && !allowedBinNames.includes(parsedPath.name)) return true;
  if (dir.includes(join("node_modules", "typescript")) && base !== "package.json" && base !== "typescript.js") return true;
  return false;
}

async function filterModulesFiles(folder) {
  const files = await fs.readdir(folder);
  await Promise.all(files.map(async (file) => {
    const path = resolve(folder, file);
    const stat = await fs.stat(path);
    if (stat.isDirectory()) return await filterModulesFiles(path);
    const parsedPath = parse(path);
    if (shouldDelete(parsedPath, path)) return await fs.rm(path);
  }));
  if ((await fs.readdir(folder)).length === 0) await fs.rmdir(folder);
}

async function packageModules() {
  let tmpBuildDir = tools.file(".tmpBuild");
  let src = tools.file("packageDependencies.json");
  let dest = tools.file(".tmpBuild/package.json");
  let srcDir = tools.file(".tmpBuild/node_modules");
  let destDir = tools.file("modules/node_modules");
  let destParent = tools.file("modules");
  await rimraf([tmpBuildDir, destParent]);
  await fs.mkdir(tmpBuildDir);
  await fs.copyFile(src, dest);
  await tools.exec({ cwd: tmpBuildDir })`pnpm install --node-linker=hoisted`;
  await filterModulesFiles(srcDir);
  await fs.mkdir(destParent);
  await fs.rename(srcDir, destDir);
}

let deps = Object.keys((await tools.readJson("packageDependencies.json")).dependencies);
deps.push("typescript");
const bundle = rollup.tasks.build({ blacklistDevDependencies: false, externalDependencies: deps, commonjsPlugin: { ignore: ["electron"] } }, { failAfterWarnings: false });

export const clean = tools.exitAfter(tasks.cleanWithGit());
export const build = tools.exitAfter(tasks.selectPnpmAndInstall(), tools.parallel(bundle, packageModules));
export const buildCi = tools.exitAfter(tasks.cleanWithGit(), tasks.prodSelectPnpmAndInstall(), tools.parallel(bundle, packageModules));