
import * as fs from "fs/promises";
import path from "path";
import { projectPath } from "./paths.js";


export { fs };

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

/**
 * Writes a file in the project.
 * @param relPath - path to the file relative to the project.
 * @param data - the string to write to the file.
 * @returns the content of the file.
 * @public
 */
export async function write(relPath: string, data: string): Promise<void> {
  return fs.writeFile(file(relPath), data, { encoding: "utf-8" });
}

/**
 * Writes the content of a file in the project as json.
 * @param relPath - path to the file relative to the project.
 * @param data - the object to stringify and write in to the file.
 * @param pretty - if the output should be indented with two spaces (default = true).
 * @returns the parsed json data.
 * @public
 */
export async function writeJson(relPath: string, data: any, pretty: boolean = true): Promise<void> {
  return await write(relPath, JSON.stringify(data, undefined, pretty ? 2 : 0));
}