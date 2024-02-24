import os from "os";
import path from "path";
import { exec } from "./tools/exec.js";
import { fs } from "./tools/file.js";
import { getPackageVersion } from "./tools/package.js";
import { cwd, gulpFileName, gulpFilePath, jsBuildToolPath } from "./tools/paths.js";
import { stubPackages, type StubPackageOptions } from "./tools/stubPackage.js";

const stubOptions: StubPackageOptions[] = [
  { name: "gulp" },
  { name: "rollup", subpaths: ["dist/shared/loadConfigFile.js", "dist/shared/parseAst.js", "dist/shared/rollup.js"] },
  { name: "@microsoft/api-extractor" },
  { name: "typescript" },
  { name: "tslib", subpaths: ["tslib.es6.js"] }];

async function main(): Promise<never> {
  const version = await getPackageVersion() || "0.0.0";
  const dependenciesDir = path.resolve(os.tmpdir(), "js-build-tool@" + version);
  await fs.copyFile(path.resolve(jsBuildToolPath, "packageDependencies.json"), path.resolve(dependenciesDir, "package.json"));
  await fs.copyFile(path.resolve(jsBuildToolPath, "pnpm-lockDependencies.yaml"), path.resolve(dependenciesDir, "pnpm-lock.yaml"));
  console.log("Preparing Dependencies");
  await exec({ cwd: dependenciesDir })`pnpm install --frozen-lockfile --config.confirmModulesPurge=false --node-linker=hoisted`;
  await stubPackages(stubOptions, dependenciesDir);
  await runGulp();
  process.exit(-1);
}

main().then(process.exit).catch((e) => {
  console.error(e);
  process.exit(-1);
});

async function runGulp(): Promise<never> {
  let src = path.resolve(cwd, gulpFileName);
  await fs.copyFile(src, gulpFilePath);
  const args = process.argv.slice(2);
  try {
    const result = await exec({ reject: false })`gulp -f ${gulpFilePath} --cwd ${cwd} ${args}`;
    process.exit(result.exitCode);
  } catch (e) {
    if ((typeof e !== "object") || (e === null) || !("exitCode" in e) || (typeof e.exitCode !== "number")) process.exit(-1);
    process.exit(e.exitCode);
  }
}