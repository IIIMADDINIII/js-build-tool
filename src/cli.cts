import os from "os";
import path from "path";
import { exec } from "./tools/exec.js";
import { fs } from "./tools/file.js";
import { getDependencies, getPackageVersion } from "./tools/package.js";
import { cwd, gulpFileName, gulpFilePath, jsBuildToolPath } from "./tools/paths.js";
import { stubPackages, type StubPackageOptions } from "./tools/stubPackage.js";




const stubSubPath: { [key: string]: string[]; } = {
  "rollup": ["dist/shared/loadConfigFile.js", "dist/shared/parseAst.js", "dist/shared/rollup.js"],
  "tslib": ["tslib.es6.js"],
};

async function main(): Promise<never> {
  const dependenciesDir = await installDependencies();
  await stubDependencies(dependenciesDir);
  await runGulp();
  process.exit(-1);
}

main().then(process.exit).catch((e) => {
  console.error(e);
  process.exit(-1);
});

async function installDependencies(): Promise<string> {
  const version = await getPackageVersion() || "0.0.0";
  const dependenciesDir = path.resolve(os.tmpdir(), "js-build-tool@" + version);
  await fs.mkdir(dependenciesDir, { recursive: true });
  await fs.copyFile(path.resolve(jsBuildToolPath, "packageDependencies.json"), path.resolve(dependenciesDir, "package.json"));
  await fs.copyFile(path.resolve(jsBuildToolPath, "pnpm-lockDependencies.yaml"), path.resolve(dependenciesDir, "pnpm-lock.yaml"));
  console.log("Preparing Dependencies");
  await exec({ cwd: dependenciesDir, verbose: false, stdio: "ignore" })`pnpm install --frozen-lockfile --config.confirmModulesPurge=false --node-linker=hoisted`;
  return dependenciesDir;
}

async function stubDependencies(dependenciesDir: string) {
  const dependencies = await getDependencies(path.resolve(dependenciesDir, "package.json"));
  const stubOptions: StubPackageOptions[] = Object.keys(dependencies).map((name) => {
    const subpaths = stubSubPath[name];
    if (subpaths) {
      return { name, subpaths };
    }
    return { name };
  });
  await stubPackages(stubOptions, path.resolve(dependenciesDir, "node_modules"));
}

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