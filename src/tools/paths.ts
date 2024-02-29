
import path from "path";
import url from 'url';

/**
 * Adds an folder to the Path variable.
 * @param folder - the folder which should be added to the path (should be absolute).
 * @public
 */
export function addToPath(folder: string): void {
  process.env["path"] = folder + ";" + process.env["path"];
}

/**
 * Finds the temporary project folder of the pnpm dlx operation.
 * @param packagePath - path inside the js-build-tool.
 * @returns the upper most folder with node_modules inside.
 * @public
 */
export function findDlxPath(packagePath: string): string {
  return packagePath.slice(0, packagePath.indexOf("node_modules"));
}

/**
 * Finds the path where js-build-tool was installed by pnpm.
 * @param start - path inside the js-build-tool.
 * @returns path to the folder named "js-build-tool".
 * @public
 */
export function findJsBuildToolPath(start: string) {
  let dir = start;
  while (!dir.endsWith("js-build-tool")) {
    const newDir = path.resolve(dir, "..");
    if (newDir === dir) throw new Error("js-build-tool Path could not be found");
    dir = newDir;
  }
  return dir;
}

/**
 * The path of this file.
 * @public
 */
export const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/**
 * The temporary project folder of the pnpm dlx operation.
 * @public
 */
export const dlxPath = findDlxPath(__dirname);

/**
 * Current working directory.
 * @public
 */
export const cwd = process.cwd();

/**
 * Project folder (current working directory).
 * @public
 */
export const projectPath = cwd;

/**
 * node_modules folder inside the project.
 * @public
 */
export const projectNodeModulesPath = path.resolve(projectPath, "node_modules");

/**
 * The name of the gulpfile.
 * @public
 */
export const gulpFileName = "gulpfile.mjs";

/**
 * The path to the gulpfile.
 * @public
 */
export const gulpFilePath = path.resolve(dlxPath, gulpFileName);

/**
 * Path where the js-build-tool was installed.
 * @public
 */
export const jsBuildToolPath = findJsBuildToolPath(__dirname);

/**
 * The node_modules folder inside the temporary project folder of the pnpm dlx operation.
 * @public
 */
export const nodeModulesPath = path.resolve(dlxPath, "node_modules");

/**
 * The path of the executables (.bin) inside the temporary folder for the dlx operation.
 * @public
 */
export const binPath = path.resolve(nodeModulesPath, ".bin");