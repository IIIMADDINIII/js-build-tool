
import path from "path";
import { projectPath } from "./paths.js";
import { createRequire } from "module";


export let fs = createRequire("/")("fs").promises;

export function reloadFs() {
  fs = createRequire("/")("fs").promises;
}

export function file(relPath: string): string {
  return path.resolve(projectPath, relPath);
}

export async function read(relPath: string): Promise<string> {
  return fs.readFile(file(relPath), { encoding: "utf-8" });
}

export async function readJson(relPath: string): Promise<any> {
  return JSON.parse(await read(relPath));
}