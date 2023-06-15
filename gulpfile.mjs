import * as fs from "fs/promises";
import { exec } from "gulp-execa";
import { rimraf } from "rimraf";
import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";

async function packageModules() {
  let tmpBuildDir = tools.file(".tmpBuild");
  let src = tools.file("packageDependencies.json");
  let dest = tools.file(".tmpBuild/package.json");
  let srcDir = tools.file(".tmpBuild/node_modules");
  let destDir = tools.file("modules");
  await rimraf([tmpBuildDir, destDir]);
  await fs.mkdir(tmpBuildDir);
  await fs.copyFile(src, dest);
  await exec("pnpm install --node-linker=hoisted", { cwd: tmpBuildDir });
  await fs.rename(srcDir, destDir);
}

let deps = Object.keys((await tools.readJson("packageDependencies.json")).dependencies);
const bundle = rollup.tasks.build({ blacklistDevDependencies: false, externalDependencies: deps }, { failAfterWarnings: false });

export const clean = tools.series(tasks.cleanWithGit());
export const build = tools.series(tasks.selectPnpmAndInstall(), tools.parallel(bundle, packageModules));
export const buildCi = tools.series(tasks.cleanWithGit(), tasks.prodSelectPnpmAndInstall(), tools.parallel(bundle, packageModules));
