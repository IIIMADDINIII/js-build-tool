import { exec } from "gulp-execa";
import { rimraf } from "rimraf";
import { file, tasks, isProd, rollup, series, parallel } from "@iiimaddiniii/js-build-tool";
import * as fs from "fs/promises";
import * as path from "path";

import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { consts } from 'rollup-plugin-consts';
import sourceMaps from 'rollup-plugin-include-sourcemaps';

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
  await rollup.run({
    input: `./src/index.ts`,
    output: {
      file: `./dist/index.js`,
      format: "esm",
      sourcemap: true,
    },
    plugins
  });
}

export const clean = series(tasks.selectPnpmAndInstall(), tasks.cleanWithGit);
export const build = series(tasks.selectPnpmAndInstall(), parallel(bundle, packageModules));
export const buildCi = series(tasks.prodSelectPnpmAndInstall(), tasks.cleanWithGit, parallel(bundle, packageModules));
export const test = series(tasks.selectPnpmAndInstall(), parallel(rollup.tasks.build(), packageModules));