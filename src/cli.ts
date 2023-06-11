// Reference Switches so that the const:production and const:development packages are defined
/// <reference types="rollup-config-iiimaddiniii/switches" />


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
  let date = new Date();
  await copyNodeModules(packagePath, dlxPath);
  console.log(date.getTime() - (new Date()).getTime());
  await copyGulpFile(cwd, dlxPath, gulpFile);
  runGulp(cwd, dlxPath, gulpFile);
}

async function copyNodeModules(packagePath: string, dlxPath: string) {
  const modules = path.resolve(packagePath, "modules");
  const nodeModules = path.resolve(dlxPath, "node_modules");
  await dirsMerge(modules, nodeModules);
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

export async function dirsMerge(sourceDir: string, destinationDir: string): Promise<void> {
  const sourceEntryNames = await fs.readdir(sourceDir);
  await Promise.all(sourceEntryNames.map(async (sourceEntryName) => {
    const sourceEntryPath = path.join(sourceDir, sourceEntryName);
    const destinationEntryPath = path.join(destinationDir, sourceEntryName);
    try {
      const destStats = await fs.stat(destinationEntryPath);
      if (destStats.isDirectory()) {
        await dirsMerge(sourceEntryPath, destinationEntryPath);
      } else {
        return;
      }
    } catch (error) {
      if ((typeof error !== "object") || (error === null) || !("code" in error) || (error.code !== "ENOENT")) throw error;
      await fs.rename(sourceEntryPath, destinationEntryPath);
    }
  }));
}

run().catch(console.error);