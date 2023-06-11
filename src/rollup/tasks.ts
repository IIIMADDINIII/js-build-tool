import * as fs from "fs/promises";
import type { RollupOptions } from "rollup";
import type { CommandOptions, DefaultConfigs } from "./tools.js";
import { calculatePackageJsonTypes, defaultConfigs, run as toolRun } from "./tools.js";

export function run(rollupOptions: RollupOptions[] | RollupOptions, commandOptions: CommandOptions): () => Promise<void> {
  async function rollupRun(): Promise<void> {
    await toolRun(rollupOptions, commandOptions);
  }
  rollupRun.displayName = "rollupRun";
  return rollupRun;
}

const PackageEsContent = `{"type":"module"}`;
const PackageCjsContent = `{"type":"commonjs"}`;
export function build(options: DefaultConfigs, commandOptions: CommandOptions) {
  async function rollupDefaults() {
    let config = await defaultConfigs(options);
    await toolRun(config, commandOptions);
    let packageLocations = await calculatePackageJsonTypes(config);
    await Promise.all(packageLocations.map((data) => {
      fs.writeFile(data.packageJsonPath, data.format === "es" ? PackageEsContent : PackageCjsContent);
    }));
  }
  rollupDefaults.displayName = "rollupDefaults";
  return rollupDefaults;
}