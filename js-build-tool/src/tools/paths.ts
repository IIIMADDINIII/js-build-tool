
import { basename, delimiter, dirname, resolve } from "path";
import url from 'url';

/**
 * Adds an folder to the Path variable.
 * @param folder - the folder which should be added to the path (should be absolute).
 * @param append - put the folder at the end => low priority (default = false; path is prepended => higher priority).
 * @public
 */
export function addToPath(folder: string, append: boolean = false): void {
  const path = (process.env["path"] || "").split(delimiter);
  if (append) { path.push(resolve(folder)); }
  else { path.unshift(resolve(folder)); }
  process.env["path"] = path.join(delimiter);
}

/**
 * The path of this file.
 * @public
 */
export const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/**
 * Current working directory at start of the Application.
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
export const projectNodeModulesPath = resolve(projectPath, "node_modules");

/**
 * The path to the gulpfile.
 * @public
 */
export const gulpFilePath = process.env["GULP_FILE"];
if (gulpFilePath === undefined) throw new Error("Environment Variable GULP_FILE is not set. Please execute using @iiimaddiniii/js-build-tool-cli");

/**
 * The name of the gulpfile.
 * @public
 */
export const gulpFileName = basename(gulpFilePath);

/**
 * Directory where the gulp file is.
 * @public
 */
export const gulpDirectory = dirname(gulpFilePath);

/**
 * Folder of the GulpFile where this codes Executes.
 * Is also home to the node_modules for additional packages when specified.
 * Can be used to store temporary files wich will be deleted after the task finished.
 * @public
 */
export const buildDir = gulpFilePath;