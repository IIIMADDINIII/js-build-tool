import fs from "fs/promises";
import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";
import { join, parse, resolve } from "path";

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
  const tmpBuildDir = tools.file(".tmpBuild");
  const srcPackage = tools.file("packageDependencies.json");
  const srcLock = tools.file("pnpm-lockDependencies.yaml");
  const destPackage = tools.file(".tmpBuild/package.json");
  const destLock = tools.file(".tmpBuild/pnpm-lock.yaml");
  let srcDir = tools.file(".tmpBuild/node_modules");
  let destFile = tools.file("node_modules.asar");
  try { await fs.rm(destFile); } catch { }
  try { await fs.mkdir(tmpBuildDir); } catch { }
  await fs.copyFile(srcPackage, destPackage);
  await fs.copyFile(srcLock, destLock);
  if (tools.isProd()) {
    await tools.exec({ cwd: tmpBuildDir })`pnpm install --frozen-lockfile --config.confirmModulesPurge=false --node-linker=hoisted`;
  } else {
    await tools.exec({ cwd: tmpBuildDir })`pnpm install --config.confirmModulesPurge=false --node-linker=hoisted`;
    await fs.copyFile(destLock, srcLock);
  }
  await filterModulesFiles(srcDir);
  await tools.stubProjectPackage({ name: "@electron/asar" });
  let asar = await import("@electron/asar");
  await asar.createPackageWithOptions(tmpBuildDir, destFile, { unpack: "*.node" });
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
  bundleDeclarationPackages: [
    "@schemastore/package",
    "execa",
    "fetch-github-release",
    "@microsoft/api-extractor",
    "@rollup/plugin-terser",
    "gulp",
    "rollup",
    "@rollup/plugin-commonjs",
    "@rollup/plugin-json",
    "@rollup/plugin-node-resolve",
    "@rollup/plugin-typescript",
    "rollup-plugin-include-sourcemaps",
    "@rollup/pluginutils",
    "terser",
    "@octokit/rest",
    "@microsoft/api-extractor-model",
    "@octokit/plugin-rest-endpoint-methods",
    "@jridgewell/source-map",
    "@octokit/types",
    "@jridgewell/trace-mapping",
    "@octokit/openapi-types",
    "estree"],
}, { failAfterWarnings: false });

export const clean = tools.exitAfter(tasks.cleanWithGit());
export const build = tools.exitAfter(
  tasks.selectPnpmAndInstall(),
  tools.parallel(bundle, packageModules),
  copyAsarNodeAutorunJs);
export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.setProd(),
  tasks.installDependencies(),
  tools.parallel(bundle, packageModules),
  copyAsarNodeAutorunJs);