
import { register } from "asar-node";
register();

import { syncBuiltinESMExports } from "module";
syncBuiltinESMExports();

import cp from "child_process";
import path from "path";
import { fs, reloadFs } from "../tools/file.js";
import { binPath, cwd, gulpFileName, gulpFilePath, jsBuildToolPath } from "../tools/paths.js";
import { StubPackageOptions, stubPackages, type StubProjectPackageOptions } from "../tools/stubPackage.js";

const nodeModulesAsar = path.resolve(jsBuildToolPath, "node_modules.asar/node_modules");

const asarStubOptions: StubProjectPackageOptions[] = [
  { name: "gulp" },
  { name: "rollup", subpaths: ["dist/shared/loadConfigFile.js", "dist/shared/parseAst.js", "dist/shared/rollup.js"] },
  { name: "@microsoft/api-extractor" },
  { name: "typescript" },
  { name: "tslib", subpaths: ["tslib.es6.js"] }];

async function stubAsarPackages() {
  let options: StubPackageOptions[] = asarStubOptions.map((options) => {
    return {
      bin: true,
      location: path.resolve(nodeModulesAsar, options.name),
      ...options
    };
  });
  await stubPackages(options);
}

async function copyGulpFile() {
  let src = path.resolve(cwd, gulpFileName);
  await fs.copyFile(src, gulpFilePath);
}

function runGulp() {
  const args = "\"" + process.argv.slice(2).join("\" \"") + "\"";
  try {
    let command = `gulp -f "${gulpFilePath}" --cwd "${cwd}" ${args}`;
    cp.execSync(command, { stdio: "inherit", cwd: binPath, env: { NODE_OPTIONS: `-r "${path.resolve(jsBuildToolPath, "./dist/asar-node-autostart.cjs").replaceAll("\\", "/")}"` } });
  } catch (e) {
    if ((typeof e !== "object") || (e === null) || !("status" in e) || (typeof e.status !== "number")) process.exit(-1);
    process.exit(e.status);
  }
}

async function run() {
  reloadFs();
  await stubAsarPackages();
  await copyGulpFile();
  runGulp();
}

run().catch(console.error);