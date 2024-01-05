
import type { promises } from "fs";
import { createRequire } from "module";
import path from "path";
import { projectPath } from "./paths.js";

/**
 * The NodeJs fs/promises module.
 * @public
 */
export let fs: typeof promises = createRequire("/")("fs").promises;

/**
 * Reloads the fs module (maybe because it was monkey patched).
 * @returns the just loaded fs/promises module.
 * @public
 */
export function reloadFs(): typeof promises {
  fs = createRequire("/")("fs").promises;
  return fs;
}

/**
 * returns the absolute path of a file in the project.
 * @param relPath - path to the file relative to the project.
 * @returns the absolute path of the file.
 * @public
 */
export function file(relPath: string): string {
  return path.resolve(projectPath, relPath);
}

/**
 * Reads the content of a file in the project.
 * @param relPath - path to the file relative to the project.
 * @returns the content of the file.
 * @public
 */
export async function read(relPath: string): Promise<string> {
  return fs.readFile(file(relPath), { encoding: "utf-8" });
}

/**
 * Reads the content of a file in the project as json.
 * @param relPath - path to the file relative to the project.
 * @returns the parsed json data.
 * @public
 */
export async function readJson(relPath: string): Promise<any> {
  return JSON.parse(await read(relPath));
}