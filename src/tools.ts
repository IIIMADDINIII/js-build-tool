
import type { JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package";
import * as fs from "fs/promises";
import gulp from "gulp";
import * as path from "path";

export const series: typeof gulp.series = gulp.series;
export const parallel: typeof gulp.parallel = gulp.parallel;
export type { TaskFunction } from "gulp";


let prod = false;
export const cwd = process.cwd();
export const packageDir = cwd;

export function isProd(): boolean {
  return prod;
}

export function setProd(): void {
  prod = true;
}

export function file(relPath: string): string {
  return path.resolve(packageDir, relPath);
}

let packageCache: JSONSchemaForNPMPackageJsonFiles | null = null;
export async function getPackageJson(cache: boolean = true): Promise<JSONSchemaForNPMPackageJsonFiles> {
  if (packageCache !== null && cache) return packageCache;
  let packagePath = file("package.json");
  let content = await fs.readFile(packagePath, { encoding: "utf-8" });
  let json = JSON.parse(content);
  packageCache = json;
  return json;
}



