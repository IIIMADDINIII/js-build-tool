
import path from "path";
import url from 'url';

export function findDlxPath(packagePath: string): string {
  return packagePath.slice(0, packagePath.indexOf("node_modules"));
}
export function findJsBuildToolPath(start: string) {
  let dir = start;
  while (!dir.endsWith("js-build-tool")) {
    const newDir = path.resolve(dir, "..");
    if (newDir === dir) throw new Error("js-build-tool Path could not be found");
    dir = newDir;
  }
  return dir;
}

export const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const dlxPath = findDlxPath(__dirname);
export const cwd = process.cwd();
export const projectPath = cwd;
export const gulpFileName = "gulpfile.mjs";
export const gulpFilePath = path.resolve(dlxPath, gulpFileName);
export const jsBuildToolPath = findJsBuildToolPath(__dirname);
export const nodeModulesPath = path.resolve(dlxPath, "node_modules");
export const binPath = path.resolve(nodeModulesPath, ".bin");