import gulp from "@iiimaddiniii/js-build-tool/gulp";
import { exec } from "@iiimaddiniii/js-build-tool/execa";
import { rimraf } from "@iiimaddiniii/js-build-tool/rimraf";
import * as fs from "fs/promises";
import * as path from "path";

let prod = false;
let cwd = process.cwd();

export async function clean() {
  await exec("git clean -dfX");
}

export async function bundle() {
  let env = {};
  if (prod) {
    env.prod = "true";
  }
  await exec("pnpm exec rollup --config node:iiimaddiniii", { env });
}

export async function build() {
  await bundle();
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
  return;
}

export async function buildCi() {
  prod = true;
  await clean();
  await bundle();
}
