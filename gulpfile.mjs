import { exec } from "@iiimaddiniii/js-build-tool/execa";
import { rimraf } from "@iiimaddiniii/js-build-tool/rimraf";
import { series, parallel } from "@iiimaddiniii/js-build-tool/gulp";
import { prodSelectPnpmAndInstall, selectPnpmAndInstall, cleanWithGit } from "@iiimaddiniii/js-build-tool";
import * as fs from "fs/promises";
import * as path from "path";

async function bundle() {
  await exec("pnpm install");
  let env = {};
  if (prod) {
    env.prod = "true";
  }
  await exec("pnpm exec rollup --config node:iiimaddiniii", { env });
}

async function packageModules() {
  let tmpBuildDir = path.resolve(cwd, ".tmpBuild");
  let src = path.resolve(cwd, "packageDependencies.json");
  let dest = path.resolve(tmpBuildDir, "package.json");
  let srcDir = path.resolve(tmpBuildDir, "node_modules");
  let destDir = path.resolve(cwd, "modules");
  await rimraf([tmpBuildDir, destDir]);
  await fs.mkdir(tmpBuildDir);
  await fs.copyFile(src, dest);
  await exec("pnpm install --node-linker=hoisted", { cwd: tmpBuildDir });
  await fs.rename(srcDir, destDir);
}

export const clean = series(selectPnpmAndInstall, cleanWithGit);
export const build = series(selectPnpmAndInstall, parallel(bundle, packageModules));
export const buildCi = series(prodSelectPnpmAndInstall, cleanWithGit, parallel(bundle, packageModules));
