import { exec } from "@iiimaddiniii/js-build-tool/execa";
import { rimraf } from "@iiimaddiniii/js-build-tool/rimraf";
import { series, parallel } from "@iiimaddiniii/js-build-tool/gulp";
import { file, cleanWithGit, selectPnpmAndInstall, prodSelectPnpmAndInstall, isProd } from "@iiimaddiniii/js-build-tool";
import * as fs from "fs/promises";
import * as path from "path";

async function bundle() {
  await exec("pnpm install");
  let env = {};
  if (isProd) {
    env.prod = "true";
  }
  await exec("pnpm exec rollup --config node:iiimaddiniii", { env });
}

async function packageModules() {
  let tmpBuildDir = file(".tmpBuild");
  let src = file("packageDependencies.json");
  let dest = file(".tmpBuild/package.json");
  let srcDir = file(".tmpBuild/node_modules");
  let destDir = file("modules");
  await rimraf([tmpBuildDir, destDir]);
  await fs.mkdir(tmpBuildDir);
  await fs.copyFile(src, dest);
  await exec("pnpm install --node-linker=hoisted", { cwd: tmpBuildDir });
  await fs.rename(srcDir, destDir);
}

export const clean = series(selectPnpmAndInstall(), cleanWithGit);
export const build = series(selectPnpmAndInstall(), parallel(bundle, packageModules));
export const buildCi = series(prodSelectPnpmAndInstall(), cleanWithGit, parallel(bundle, packageModules));
