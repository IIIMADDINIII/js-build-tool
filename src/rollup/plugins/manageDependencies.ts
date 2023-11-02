
import { normalizePath } from "@rollup/pluginutils";
import { fs } from "../../tools/file.js";
import { resolve } from "path";
import type { Plugin } from "rollup";

// Plugin for checking devDependencies and mark dependencies as external
class ManageDependenciesError extends Error { }

export interface ManageDependenciesConfig {
  external?: string[];
  blacklist?: string[];
}

export function manageDependencies(config: ManageDependenciesConfig): Plugin {
  // Calculate external packages
  let external = config.external || [];
  let blacklist = config.blacklist || [];
  let packagePath = normalizePath(resolve(process.cwd() + "/package.json"));
  // returns true, if the import String is part of a Package
  function matchesPackage(imported: string, packages: string[]): false | null {
    for (let dependency of packages) {
      if (imported === dependency) return false;
      if (imported.startsWith(dependency + "/")) return false;
    }
    return null;
  }

  // returns the path of the related package.json of a file
  async function findPackage(importer: string): Promise<string | null> {
    let importerPath = importer.split("/").slice(0, -1);
    let path = importerPath.join("/");
    if (!importer.startsWith(path)) return null;
    let file;
    while (importerPath.length >= 1) {
      file = path + "/package.json";
      try {
        await fs.access(file);
        return file;
      } catch { }
      importerPath = importerPath.slice(0, -1);
      path = importerPath.join("/");
    }
    return null;
  }

  // Throw on illegal modules and mark es external
  return {
    name: 'manage-dependencies',
    async resolveId(imported, importer, _options) {
      if (importer === undefined) return null;
      if (/\0/.test(imported)) return null;
      if (await findPackage(normalizePath(importer)) !== packagePath) return matchesPackage(imported, external);
      if (matchesPackage(imported, blacklist) !== null) {
        throw new ManageDependenciesError(`Dependency ${imported} is blacklisted and is not allowed to be imported (${importer})`);
      };
      if (matchesPackage(imported, external) !== null) return false;
      return null;
    }
  };
};