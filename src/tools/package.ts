
import type { Dependency, JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package";
import { file, readJson } from "./file.js";

/**
 * The type of a package.json file.
 * @public
 */
export type PackageJsonSchema = JSONSchemaForNPMPackageJsonFiles;


let packageCache: Map<string, JSONSchemaForNPMPackageJsonFiles> = new Map();
/**
 * Reads the contents of a package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns the Object representing the content of the package.json file.
 * @public
 */
export async function readPackageJson(path: string = "package.json", cache: boolean = true): Promise<JSONSchemaForNPMPackageJsonFiles> {
  path = file(path);
  if (cache) {
    const cached = packageCache.get(path);
    if (cached !== undefined) return cached;
  }
  const newData = await readJson(path);
  packageCache.set(path, newData);
  return newData;
}

/**
 * Reads the exports field of the package.json file and returns the top level export paths.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns an string[] containing all top level exports.
 * @public
 */
export async function getTopLevelExports(path: string = "package.json", cache: boolean = true): Promise<string[]> {
  let packageJson = await readPackageJson(path, cache);
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
 * Reads the Dependencies field of the package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns a Map of all dependencies.
 * @public
 */
export async function getDependencies(path: string = "package.json", cache: boolean = true): Promise<Dependency> {
  let packageJson = await readPackageJson(path, cache);
  let dependencies = packageJson.dependencies;
  if (dependencies == undefined) dependencies = {};
  return dependencies;
}

/**
 * Reads the DevDependencies field of the package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns a Map of all devDependencies.
 * @public
 */
export async function getDevDependencies(path: string = "package.json", cache: boolean = true): Promise<Dependency> {
  let packageJson = await readPackageJson(path, cache);
  let dependencies = packageJson.devDependencies;
  if (dependencies == undefined) dependencies = {};
  return dependencies;
}

/**
 * Reads the type field of the package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns the type of the project package.json file ("commonjs" | "module" | undefined).
 * @public
 */
export async function getPackageType(path: string = "package.json", cache: boolean = true): Promise<JSONSchemaForNPMPackageJsonFiles["type"]> {
  let packageJson = await readPackageJson(path, cache);
  return packageJson.type;
}

/**
 * Reads the node version to use under enginesToUse.node of the package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns the type of the project package.json file ("commonjs" | "module" | undefined).
 * @public
 */
export async function getNodeVersionToUse(path: string = "package.json", cache: boolean = true): Promise<string | undefined> {
  let packageJson = await readPackageJson(path, cache);
  return packageJson["enginesToUse"]?.["node"];
}

/**
 * Reads the version field of the package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns the type of the project package.json file ("commonjs" | "module" | undefined).
 * @public
 */
export async function getPackageVersion(path: string = "package.json", cache: boolean = true): Promise<string | undefined> {
  let packageJson = await readPackageJson(path, cache);
  return packageJson.version;
}

/**
 * Reads the name field of the package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns the type of the project package.json file ("commonjs" | "module" | undefined).
 * @public
 */
export async function getPackageName(path: string = "package.json", cache: boolean = true): Promise<string | undefined> {
  let packageJson = await readPackageJson(path, cache);
  return packageJson.name;
}

/**
 * Reads the main field of the package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns the main entry point of the project package.json file.
 * @public
 */
export async function getPackageMain(path: string = "package.json", cache: boolean = true): Promise<string | undefined> {
  let packageJson = await readPackageJson(path, cache);
  return packageJson.main;
}