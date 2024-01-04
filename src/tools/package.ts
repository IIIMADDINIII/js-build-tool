
import type { Dependency, JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package";
import { readJson } from "./file.js";

/**
 * The type of a package.json file.
 * @public
 */
export type PackageJsonSchema = JSONSchemaForNPMPackageJsonFiles;

/**
 * Reads the contents of a package.json file.
 * @param path - path to the package.json file.
 * @returns the Object representing the content of the package.json file.
 * @public
 */
export async function readPackageJson(path: string): Promise<JSONSchemaForNPMPackageJsonFiles> {
  return await readJson(path);
}

let packageCache: JSONSchemaForNPMPackageJsonFiles | null = null;
/**
 * Reads the contents of a package.json of the project and caches it.
 * @param cache - wether it should read the cached version (default = true).
 * @returns the Object representing the content of the  project package.json file.
 * @public
 */
export async function getProjectPackageJson(cache: boolean = true): Promise<JSONSchemaForNPMPackageJsonFiles> {
  if (packageCache !== null && cache) return packageCache;
  let json = await readJson("package.json");
  packageCache = json;
  return json;
}

/**
 * Reads the exports field of the project package.json file and returns the top level export paths.
 * @returns an string[] containing all top level exports.
 * @public
 */
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

/**
 * Reads the Dependencies field of the project package.json file.
 * @returns a Map of all dependencies.
 * @public
 */
export async function getProjectDependencies(): Promise<Dependency> {
  let packageJson = await getProjectPackageJson();
  let dependencies = packageJson.dependencies;
  if (dependencies == undefined) dependencies = {};
  return dependencies;
}

/**
 * Reads the DevDependencies field of the project package.json file.
 * @returns a Map of all devDependencies.
 * @public
 */
export async function getProjectDevDependencies(): Promise<Dependency> {
  let packageJson = await getProjectPackageJson();
  let dependencies = packageJson.devDependencies;
  if (dependencies == undefined) dependencies = {};
  return dependencies;
}

/**
 * Reads the type field of the project package.json file.
 * @returns the type of the project package.json file ("commonjs" | "module" | undefined).
 * @public
 */
export async function getProjectPackageType(): Promise<JSONSchemaForNPMPackageJsonFiles["type"]> {
  let packageJson = await getProjectPackageJson();
  return packageJson.type;
}