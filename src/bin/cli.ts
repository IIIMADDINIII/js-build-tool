
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
  { name: "tslib", subpaths: ["tslib.es6.js"] },
  { name: "jest" }];

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


// async function symlinkPackages(projectPath: string, packagePath: string, dlxPath: string) {
//   const projectModules = path.resolve(projectPath, "node_modules");
//   const packageModules = path.resolve(packagePath, "modules/node_modules");
//   const dlxNodeModules = path.resolve(dlxPath, "node_modules");
//   const projectSymlink = await getSymlinkDirs(projectModules);
//   await linkDirs(projectModules, dlxNodeModules, projectSymlink);
//   await linkDirs(packageModules, dlxNodeModules, packageSymlink);
// }

// async function getSymlinkDirs(projectModules: string): Promise<SymlinkPackages> {
//   try {
//     const modules = await fs.readdir(projectModules);
//     return Object.fromEntries(await Promise.all(modules.map(async (mod): Promise<[string, boolean | SymlinkPackages]> => {
//       const dir = path.resolve(projectModules, mod);
//       const stat = await fs.stat(dir);
//       if ((mod === ".bin" || mod.startsWith("@")) && stat.isDirectory()) {
//         const bins = await fs.readdir(dir);
//         return [mod, Object.fromEntries(await Promise.all(bins.map(async (name) => [name, (await fs.stat(path.resolve(dir, name))).isDirectory()])))];
//       }
//       return [mod, stat.isDirectory()];
//     })));
//   } catch {
//     return {};
//   }
// }



// async function linkDirs(sourceDir: string, destinationDir: string, dirs: SymlinkPackages): Promise<void> {
//   const sourceEntryNames = Object.entries(dirs);
//   await Promise.all(sourceEntryNames.map(async ([folder, children]) => {
//     const sourceEntryPath = path.join(sourceDir, folder);
//     const destinationEntryPath = path.join(destinationDir, folder);
//     try {
//       const destStats = await fs.stat(destinationEntryPath);
//       if ((destStats.isDirectory() || destStats.isSymbolicLink()) && typeof children === "object") {
//         await linkDirs(sourceEntryPath, destinationEntryPath, children);
//       } else {
//         return;
//       }
//     } catch (error) {
//       if ((typeof error !== "object") || (error === null) || !("code" in error) || (error.code !== "ENOENT")) throw error;
//       if (typeof children === "object" || children) {
//         await fs.symlink(sourceEntryPath, destinationEntryPath, "junction");
//       } else {
//         await fs.rename(sourceEntryPath, destinationEntryPath);
//       }
//     }
//   }));
// }

run().catch(console.error);