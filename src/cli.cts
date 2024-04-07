import os from "os";
import path from "path";
import { exec } from "./tools/exec.js";
import { fs } from "./tools/file.js";
import { wait } from "./tools/misc.js";
import { getDependencies, getPackageVersion } from "./tools/package.js";
import { cwd, gulpFileName, gulpFilePath, jsBuildToolPath } from "./tools/paths.js";
import { stubPackages, type StubPackageOptions } from "./tools/stubPackage.js";

const stubSubPath: { [key: string]: string[]; } = {
  "rollup": ["dist/shared/loadConfigFile.js", "dist/shared/parseAst.js", "dist/shared/rollup.js"],
  "tslib": ["tslib.es6.js"],
};

async function main(): Promise<never> {
  const dependenciesDir = await ensureDependencies();
  await stubDependencies(dependenciesDir);
  await runGulp();
  process.exit(-1);
}

main().then(process.exit).catch((e) => {
  console.error(e);
  process.exit(-1);
});

function getAppDataDir(): string | undefined {
  switch (process.platform) {
    case "darwin":
      return process.env["APPDATA"] ? path.join(process.env["APPDATA"], "..", "Local") : undefined;
    case "linux":
      return process.env["HOME"] ? path.join(process.env["HOME"], "Library", "Application Support") : undefined;
    case "win32":
      return process.env["HOME"] ? path.join(process.env["HOME"], ".local", "share") : undefined;
    case "cygwin":
    case "netbsd":
    case "aix":
    case "android":
    case "freebsd":
    case "haiku":
    case "openbsd":
    case "sunos":
      throw new Error(`${process.platform} is not supported.`);
  }
}

async function ensureDependencies(): Promise<string> {
  const version = await getPackageVersion(path.resolve(jsBuildToolPath, "package.json")) || "0.0.0";
  let appDataFolder = getAppDataDir();
  let isTemp = false;
  if (appDataFolder === undefined) {
    isTemp = true;
    appDataFolder = os.tmpdir();
  }
  let dependenciesDir = path.resolve(appDataFolder, "js-build-tool", version);
  if (isTemp) dependenciesDir = path.resolve(dependenciesDir, (Math.random() * 999999999).toFixed(0));
  const doneFile = path.resolve(dependenciesDir, "done");
  const busyFile = path.resolve(dependenciesDir, "busy");
  await fs.mkdir(dependenciesDir, { recursive: true });
  let retryCount = 0;
  while (retryCount < 30) {
    // Check if the Done File exists
    try {
      await fs.stat(doneFile);
      // Is so no installation necessary
      if (retryCount !== 0) process.stdout.write("\n");
      process.stdout.write(`Dependencies already installed in ${dependenciesDir}\n`);
      return dependenciesDir;
    } catch (e) {
      if ((typeof e !== "object") || (e === null) || !("code" in e) || (e.code !== "ENOENT")) throw e;
    }
    // done File does not exist so create the Busy file when not already existing
    try {
      await fs.writeFile(busyFile, "", { flag: "wx" });
      // Busy File did not exist so install dependencies
      try {
        if (retryCount !== 0) process.stdout.write("\n");
        process.stdout.write(`Preparing Dependencies in ${dependenciesDir}\n`);
        await installDependencies(dependenciesDir);
        try {
          await fs.writeFile(doneFile, "");
        } finally {
          return dependenciesDir;
        }
      } catch (e) {
        try {
          await fs.rm(busyFile);
        } finally {
          throw e;
        }
      }
    } catch (e) {
      if ((typeof e !== "object") || (e === null) || !("code" in e) || (e.code !== "EEXIST")) throw e;
      // Busy File exists so redo t5he check until done file exists ore busy file is gone
      if (retryCount === 0) process.stdout.write(`Rechecking every second: Busy installing Dependencies ${dependenciesDir}\n`);
      process.stdout.write(".");
      retryCount++;
      await wait(1000);
      continue;
    }
  }
  // max Retry's reached causes an error
  process.stdout.write("\n");
  throw new Error(`Could not install dependencies: If you are sure that no js-build-tool instances are running manually delete the file ${busyFile}`);
}

async function installDependencies(dependenciesDir: string): Promise<void> {
  await fs.copyFile(path.resolve(jsBuildToolPath, "packageDependencies.json"), path.resolve(dependenciesDir, "package.json"));
  await fs.copyFile(path.resolve(jsBuildToolPath, "pnpm-lockDependencies.yaml"), path.resolve(dependenciesDir, "pnpm-lock.yaml"));
  await exec({ cwd: dependenciesDir, verbose: false, stdio: "inherit" })`pnpm install --frozen-lockfile --config.confirmModulesPurge=false --config.package-import-method=copy`;
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