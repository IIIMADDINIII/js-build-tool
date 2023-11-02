
import type { Dependency, JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package";
import { readJson } from "./file.js";

export type PackageJsonSchema = JSONSchemaForNPMPackageJsonFiles;

export async function readPackageJson(path: string): Promise<JSONSchemaForNPMPackageJsonFiles> {
  return await readJson(path);
}

let packageCache: JSONSchemaForNPMPackageJsonFiles | null = null;
export async function getProjectPackageJson(cache: boolean = true): Promise<JSONSchemaForNPMPackageJsonFiles> {
  if (packageCache !== null && cache) return packageCache;
  let json = await readJson("package.json");
  packageCache = json;
  return json;
}

export async function getProjectTopLevelExports(): Promise<string[]> {
  let packageJson = await getProjectPackageJson();
  if (!("exports" in packageJson) || (typeof packageJson.exports !== "object") || (packageJson.exports === null)) throw new Error("Package Exports must be an object");
  // only return entries wich have more than only an type definition
  return Object.entries(packageJson.exports)
    .filter(([_key, value]) => {
      if (typeof value !== "object" || value === null) return true;
      let keys = Object.keys(value);
      return keys.length > 1 || !keys.includes("types");
    })
    .map(([key, _value]) => key);
}

export async function getProjectDependencies(): Promise<Dependency> {
  let packageJson = await getProjectPackageJson();
  let dependencies = packageJson.dependencies;
  if (dependencies == undefined) dependencies = {};
  return dependencies;
}

export async function getProjectDevDependencies(): Promise<Dependency> {
  let packageJson = await getProjectPackageJson();
  let dependencies = packageJson.devDependencies;
  if (dependencies == undefined) dependencies = {};
  return dependencies;
}

export async function getProjectPackageType(): Promise<JSONSchemaForNPMPackageJsonFiles["type"]> {
  let packageJson = await getProjectPackageJson();
  return packageJson.type;
}