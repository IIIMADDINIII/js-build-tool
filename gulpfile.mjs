import * as fs from "fs/promises";
import { exec } from "gulp-execa";
import { rimraf } from "rimraf";
import { file, tasks, rollup, series, parallel, readJson } from "@iiimaddiniii/js-build-tool";

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

let deps = Object.keys((await readJson("packageDependencies.json")).dependencies);
const bundle = rollup.tasks.build({ blacklistDevDependencies: false, externalDependencies: deps }, { failAfterWarnings: false });

export const clean = series(tasks.cleanWithGit);
export const build = series(tasks.selectPnpmAndInstall(), parallel(bundle, packageModules));
export const buildCi = series(tasks.cleanWithGit, tasks.prodSelectPnpmAndInstall(), parallel(bundle, packageModules));
