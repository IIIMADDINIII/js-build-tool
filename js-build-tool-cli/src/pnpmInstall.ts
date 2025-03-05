import { $ } from "execa";
import { writeFile } from "fs/promises";
import { delimiter, resolve } from "path";

/**
 * Installs the dependencies listed in dependencies in the folder DependenciesDir.
 * @param dependenciesDir - Folder where to install the Dependencies.
 * @param dependencies - Dependencies to install.
 */
export async function pnpmInstall(dependenciesDir: string, packageJson: unknown): Promise<void> {
  await writeFile(resolve(dependenciesDir, "package.json"), JSON.stringify(packageJson));
  await $({ cleanup: true, cwd: dependenciesDir, verbose: "none", stdio: "inherit" })`pnpm install --config.confirmModulesPurge=false --config.package-import-method=copy`;
}

/**
 * Add the .bin Folder of a dependency dir to the front of the path (highest priority).
 * @param dependenciesDir - folder containing the node_modules;
 */
export function addBinToPath(dependenciesDir: string): void {
  const path = (process.env["PATH"] || "").split(delimiter);
  path.unshift(resolve(dependenciesDir, "node_modules", ".bin"));
  process.env["PATH"] = path.join(delimiter);
}