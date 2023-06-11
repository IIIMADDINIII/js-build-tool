import { exec } from "@iiimaddiniii/js-build-tool/execa";
import { rimraf } from "@iiimaddiniii/js-build-tool/rimraf";
import gulp from "@iiimaddiniii/js-build-tool/gulp";
import * as fs from "fs/promises";
import * as path from "path";

let prod = false;
let cwd = process.cwd();

async function setProd() {
  prod = true;
}

async function selectLatestPnpmVersion() {
  await exec("corepack prepare pnpm@latest --activate");
}

async function installDependencies() {
  if (prod) {
    return await exec("pnpm install --frozen-lockfile");
  }
  await exec("pnpm install");
}

const preTasks = gulp.default.series(selectLatestPnpmVersion, installDependencies);

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

async function cleanGit() {
  await exec("git clean -dfX");
}

export const clean = gulp.default.series(preTasks, cleanGit);

export const build = gulp.default.series(preTasks, gulp.default.parallel(bundle, packageModules));
export const buildCi = gulp.default.series(setProd, preTasks, cleanGit, gulp.default.parallel(bundle, packageModules));
