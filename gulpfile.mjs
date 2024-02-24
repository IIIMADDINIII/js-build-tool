import fs from "fs/promises";
import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";

export async function updatePnpmLockDependencies() {
  if (tools.isProd()) return;
  const tmpBuildDir = tools.file(".tmpBuild");
  const srcPackage = tools.file("packageDependencies.json");
  const srcLock = tools.file("pnpm-lockDependencies.yaml");
  const destPackage = tools.file(".tmpBuild/package.json");
  const destLock = tools.file(".tmpBuild/pnpm-lock.yaml");
  try { await fs.mkdir(tmpBuildDir); } catch { }
  await fs.copyFile(srcPackage, destPackage);
  await fs.copyFile(srcLock, destLock);
  await tools.exec({ cwd: tmpBuildDir })`pnpm install --config.confirmModulesPurge=false --node-linker=hoisted --lockfile-only`;
  await fs.copyFile(destLock, srcLock);
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
  tools.parallel(bundle, updatePnpmLockDependencies));
export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.setProd(),
  tasks.installDependencies(),
  bundle);