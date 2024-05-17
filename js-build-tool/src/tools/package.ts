
import type { Dependency, JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package";
import { randomUUID } from "crypto";
import { file, readJson, writeJson } from "./file.js";

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
 * Reads the exports field of the package.json.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns the string or object/array defined in the exports field in the package.
 * @public
 */
export async function getPackageExports(path: string = "package.json", cache: boolean = true): Promise<JSONSchemaForNPMPackageJsonFiles["exports"]> {
  const packageJson = await readPackageJson(path, cache);
  return packageJson.exports;
}

/**
 * Reads the exports field of the package.json file and returns the top level export paths.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns an string[] containing all top level exports.
 * @public
 */
export async function getTopLevelExports(path: string = "package.json", cache: boolean = true): Promise<string[]> {
  const exports = await getPackageExports(path, cache);
  if ((typeof exports !== "object") || (exports === null)) throw new Error("Package Exports must be an object");
  // only return entries wich have more than only an type definition
  return Object.entries(exports)
    .filter(([_key, value]) => {
      if (typeof value !== "object" || value === null) return true;
      const keys = Object.keys(value);
      return keys.length > 1 || !keys.includes("types");
    })
    .map(([key, _value]) => key);
}


/**
 * Returns all the mentioned path inside the provided Exports.
 * @param ignoreEntries - fields to ignore while searching the exports field eg.: "require", "import" or "."  (default = ["types"]). 
 * @returns string[] including all the path found inside the exports field.
 * @public
 */
export function getAllExportsPaths(exports: JSONSchemaForNPMPackageJsonFiles["exports"], ignoreFilter: string[] = ["types"]): string[] {
  if (typeof exports === "object" && exports !== null) {
    if (Array.isArray(exports)) {
      return exports.map((v) => getAllExportsPaths(v, ignoreFilter)).flat();
    }
    let ret: string[] = [];
    for (const [key, value] of Object.entries(exports)) {
      if (ignoreFilter.includes(key)) continue;
      const values = getAllExportsPaths(value);
      ret.push(...values);
    }
    return ret;
  } else if (typeof exports === "string") {
    return [exports];
  } else {
    return [];
  }
}

/**
 * Reads the exports field of the package.json and returns all the mentioned path inside there.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @param ignoreEntries - fields to ignore while searching the exports field eg.: "require", "import" or "."  (default = ["types"]). 
 * @returns string[] including all the path found inside the exports field.
 * @public
 */
export async function getAllPackageExportsPaths(path: string = "package.json", cache: boolean = true, ignoreEntries: string[] = ["types"]) {
  const exports = await getPackageExports(path, cache);
  return getAllExportsPaths(exports, ignoreEntries);
}

/**
 * Reads the Dependencies field of the package.json file.
 * @param path - path to the package.json file (default = projects package.json file).
 * @param cache - wether to use a previously cached result (default = true).
 * @returns a Map of all dependencies.
 * @public
 */
export async function getDependencies(path: string = "package.json", cache: boolean = true): Promise<Dependency> {
  const packageJson = await readPackageJson(path, cache);
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
  const packageJson = await readPackageJson(path, cache);
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
  const packageJson = await readPackageJson(path, cache);
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
  const packageJson = await readPackageJson(path, cache);
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
  const packageJson = await readPackageJson(path, cache);
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
  const packageJson = await readPackageJson(path, cache);
  return packageJson.main;
}

/**
 * Reads the UUID of the upgradeCode field in the Package.json.
 * generates a new UUID and saved the Package.json if it does not exist.
 * @param path - path to the package.json file (default = "./package.json").
 * @param cache - wether to use the cached package.json data (default = true).
 * @returns the UUID in the Package.json.
 */
export async function getUpgradeCode(path: string = "package.json", cache: boolean = true): Promise<string> {
  let packageJson = await readPackageJson(path, cache);
  const data: unknown = packageJson["upgradeCode"];
  if (typeof data === "string") return data;
  packageJson = await readPackageJson(path, false);
  packageJson["upgradeCode"] = randomUUID();
  writeJson(path, packageJson);
  await readPackageJson(path, false);
  return packageJson["upgradeCode"];
}