import fs from "fs/promises";
import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";
import { join, parse, resolve } from "path";
import { createPackageWithOptions } from "@electron/asar";

const allowedBinNames = ["gulp"];
const filterBasePrefix = ["license", "completion.sh", ".", "authors", "changelog", "changes", "makefile"];
const filterBaseSuffix = [".md", ".yaml", ".map", ".ts", ".mts", ".cts", ".yml", ".txt", ".html", ".coffee", ".markdown", ".tsbuildinfo"];
const filterDirIncludes = [join("node_modules", "@types"), "__tests__"];

/***
 * @param {import("path").ParsedPath} parsedPath 
 * @param {string} path 
 */
function shouldDelete(parsedPath, path) {
  const base = parsedPath.base.toLocaleLowerCase();
  const dir = parsedPath.dir.toLocaleLowerCase();
  if (dir.includes(join("node_modules", "typescript")) && base.endsWith(".d.ts")) return false;
  if (dir.includes(join("node_modules", "typescript")) && base !== "package.json" && base !== "typescript.js") return true;
  if (filterBasePrefix.some((prefix) => base.startsWith(prefix))) return true;
  if (filterBaseSuffix.some((suffix) => base.endsWith(suffix))) return true;
  if (filterDirIncludes.some((infix) => dir.includes(infix))) return true;
  if (dir.endsWith(".bin") && !allowedBinNames.includes(parsedPath.name)) return true;
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

export async function packageModules() {
  let tmpBuildDir = tools.file(".tmpBuild");
  let src = tools.file("packageDependencies.json");
  let dest = tools.file(".tmpBuild/package.json");
  let srcDir = tools.file(".tmpBuild/node_modules");
  let destFile = tools.file("node_modules.asar");
  try { await fs.rm(destFile); } catch { }
  try { await fs.mkdir(tmpBuildDir); } catch { }
  await fs.copyFile(src, dest);
  await tools.exec({ cwd: tmpBuildDir })`pnpm install --node-linker=hoisted`;
  await filterModulesFiles(srcDir);
  await createPackageWithOptions(tmpBuildDir, destFile, { unpack: "*.node" });
}

async function copyAsarNodeAutorunJs() {
  let autostart = await tools.read("./node_modules/asar-node/dist/autorun.js");
  let appendix = await tools.read("./autostart_appendix.js");
  await fs.writeFile(tools.file("./dist/asar-node-autostart.cjs"), autostart + appendix);
}

let deps = Object.keys((await tools.readJson("packageDependencies.json")).dependencies);
deps.push("typescript");
const bundle = rollup.tasks.build({
  blacklistDevDependencies: false,
  externalDependencies: deps,
  commonjsPlugin: { ignore: ["electron"] },
}, { failAfterWarnings: false });

export const clean = tools.exitAfter(tasks.cleanWithGit());
export const build = tools.exitAfter(
  tasks.selectPnpmAndInstall(),
  tools.parallel(bundle, packageModules),
  copyAsarNodeAutorunJs);
export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodSelectPnpmAndInstall(),
  tools.parallel(bundle, packageModules),
  copyAsarNodeAutorunJs);