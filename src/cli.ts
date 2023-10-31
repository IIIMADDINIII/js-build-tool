
import * as cp from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import * as url from 'url';

async function run() {
  const gulpFile = "gulpfile.mjs";
  const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
  const cwd = process.cwd();
  const packagePath = path.resolve(__dirname, "..");
  const dlxPath = findDlxPath(packagePath);
  await symlinkPackages(packagePath, dlxPath);
  await copyGulpFile(cwd, dlxPath, gulpFile);
  runGulp(cwd, dlxPath, gulpFile);
}

type SymlinkPackages = { [key: string]: boolean | SymlinkPackages; };
const SymlinkPackages: SymlinkPackages = {
  ".bin": {
    "gulp": false,
    "gulp.CMD": false,
    "gulp.ps1": false,
  },
  "tslib": true,
  "gulp": true,
  "rollup": true,
  "@rollup": {
    "plugin-commonjs": true,
    "plugin-node-resolve": true,
    "plugin-terser": true,
    "plugin-json": true,
    "pluginutils": true
  },
  "rollup-plugin-include-sourcemaps": true,
  "@electron-forge": {
    "core": true,
    "maker-wix": true,
    "maker-zip": true,
  },
};

async function symlinkPackages(packagePath: string, dlxPath: string) {
  const modules = path.resolve(packagePath, "modules/node_modules");
  const dlxNodeModules = path.resolve(dlxPath, "node_modules");
  await linkDirs(modules, dlxNodeModules, SymlinkPackages);
}

async function copyGulpFile(cwd: string, dlxPath: string, gulpFile: string) {
  let src = path.resolve(cwd, gulpFile);
  let dest = path.resolve(dlxPath, gulpFile);
  await fs.copyFile(src, dest);
}

function runGulp(cwd: string, dlxPath: string, gulpFile: string) {
  const args = "\"" + process.argv.slice(2).join("\" \"") + "\"";
  const gulpfile = path.resolve(dlxPath, gulpFile);
  const bin = path.resolve(dlxPath, "node_modules/.bin");
  try {
    let command = `gulp -f "${gulpfile}" --cwd "${cwd}" ${args}`;
    cp.execSync(command, { stdio: "inherit", cwd: bin });
  } catch (e) {
    if ((typeof e !== "object") || (e === null) || !("status" in e) || (typeof e.status !== "number")) process.exit(-1);
    process.exit(e.status);
  }
}

function findDlxPath(packagePath: string): string {
  return packagePath.slice(0, packagePath.indexOf("node_modules"));
}

export async function linkDirs(sourceDir: string, destinationDir: string, dirs: SymlinkPackages): Promise<void> {
  const sourceEntryNames = Object.entries(dirs);
  await Promise.all(sourceEntryNames.map(async ([folder, children]) => {
    const sourceEntryPath = path.join(sourceDir, folder);
    const destinationEntryPath = path.join(destinationDir, folder);
    try {
      const destStats = await fs.stat(destinationEntryPath);
      if ((destStats.isDirectory() || destStats.isSymbolicLink()) && typeof children === "object") {
        await linkDirs(sourceEntryPath, destinationEntryPath, children);
      } else {
        return;
      }
    } catch (error) {
      if ((typeof error !== "object") || (error === null) || !("code" in error) || (error.code !== "ENOENT")) throw error;
      if (typeof children === "object" || children) {
        await fs.symlink(sourceEntryPath, destinationEntryPath, "junction");
      } else {
        await fs.rename(sourceEntryPath, destinationEntryPath);
      }
    }
  }));
}

run().catch(console.error);