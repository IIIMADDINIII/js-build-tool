import { mkdir } from "fs/promises";
import { addBinToPath, pnpmInstall } from "./pnpmInstall.js";

/**
 * Installs additional Dependencies listed in args with "--package=name@version" or "-p=name@version".
 * This Option can be specified multiple times.
 * Version might contain local file Path or urls as pnpm would understand them.
 * Gets transformed in to a package.json file like {"dependencies": {"package": "version"}}.
 * If version is not specified ">=0" is used is used.
 * Add 
 * @param tempDir - Directory where to install these Dependencies.
 * @returns A list of arguments wich where not used.
 */
export async function installCustomDependencies(tempDir: string): Promise<string[]> {
  await mkdir(tempDir, { recursive: true });
  const dependencies: { [key: string]: string; } = {};
  const onlyBuiltDependencies: string[] = [];
  const remainingArgs = process.argv.slice(2).filter((arg) => {
    const match = arg.match(/^(-(-package|p)=(?<p>@?[^@]+)(@(?<v>.*))?|-(-build|b)=(?<b>@?[^@]+))$/);
    const p = match?.groups?.["p"];
    const v = match?.groups?.["v"];
    const b = match?.groups?.["b"];
    if (p !== undefined) {
      dependencies[p] = v === undefined ? ">=0" : v;
      return false;
    }
    if (b !== undefined) {
      onlyBuiltDependencies.push(b);
      return false;
    }
    return true;
  });
  if (Object.getOwnPropertyNames(dependencies).length !== 0) {
    process.stdout.write(`Installing additional dependencies in ${tempDir}\n`);
    await pnpmInstall(tempDir, { dependencies, pnpm: { onlyBuiltDependencies } });
    addBinToPath(tempDir);
  }
  return remainingArgs;
}