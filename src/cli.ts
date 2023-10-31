
import * as cp from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import * as url from 'url';

async function run() {
  const gulpFile = "gulpfile.mjs";
  const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
  const projectPath = process.cwd();
  const packagePath = path.resolve(__dirname, "..");
  const dlxPath = findDlxPath(packagePath);
  await symlinkPackages(projectPath, packagePath, dlxPath);
  await copyGulpFile(projectPath, dlxPath, gulpFile);
  runGulp(projectPath, dlxPath, gulpFile);
}

type SymlinkPackages = { [key: string]: boolean | SymlinkPackages; };
const packageSymlink: SymlinkPackages = {
  ".bin": {
    "gulp": false,
    "gulp.CMD": false,
    "gulp.ps1": false,
  },
  "gulp": true,
  "rollup": true,
};

async function symlinkPackages(projectPath: string, packagePath: string, dlxPath: string) {
  const projectModules = path.resolve(projectPath, "modules/node_modules");
  const packageModules = path.resolve(packagePath, "modules/node_modules");
  const dlxNodeModules = path.resolve(dlxPath, "node_modules");
  const projectSymlink = await getSymlinkDirs(projectModules);
  await linkDirs(projectModules, dlxNodeModules, projectSymlink);
  await linkDirs(packageModules, dlxNodeModules, packageSymlink);
}

async function getSymlinkDirs(projectModules: string): Promise<SymlinkPackages> {
  try {
    const modules = await fs.readdir(projectModules);
    return Object.fromEntries(await Promise.all(modules.map(async (mod): Promise<[string, boolean | SymlinkPackages]> => {
      const dir = path.resolve(projectModules, mod);
      const stat = await fs.stat(dir);
      if (mod === ".bin" && stat.isDirectory()) {
        const bins = await fs.readdir(dir);
        return [".bin", Object.fromEntries(bins.map((name) => [name, false]))];
      }
      return [mod, stat.isDirectory()];
    })));
  } catch {
    return {};
  }
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