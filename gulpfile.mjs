import { exec } from "gulp-execa";
import { rimraf } from "rimraf";
import gulp from "gulp";
import { file, cleanWithGit, selectPnpmAndInstall, prodSelectPnpmAndInstall, isProd, runRollup } from "@iiimaddiniii/js-build-tool";
import * as fs from "fs/promises";
import * as path from "path";

import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { consts } from 'rollup-plugin-consts';
import sourceMaps from 'rollup-plugin-include-sourcemaps';

const { series, parallel } = gulp;

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

async function bundleTest() {
  let plugins = [
    //manageDepsPlugin(config),
    consts({ production: false, development: true }),
    json(),
    commonjs(),
    typescript({ noEmitOnError: true, outputToFilesystem: true, declaration: true, declarationMap: true }),
    sourceMaps(),
    nodeResolve(),
  ];
  await runRollup({
    input: `./src/index.ts`,
    output: {
      file: `./dist/index.js`,
      format: "esm",
      sourcemap: true,
    },
    plugins
  })();
}

export const clean = series(selectPnpmAndInstall(), cleanWithGit);
export const build = series(selectPnpmAndInstall(), parallel(bundle, packageModules));
export const buildCi = series(prodSelectPnpmAndInstall(), cleanWithGit, parallel(bundle, packageModules));
export const test = series(selectPnpmAndInstall(), parallel(bundleTest, packageModules));