
import type { RollupOptions } from "rollup";
import type { CommandOptions, DefaultConfigs } from "./tools.js";
import { build as toolBuild, run as toolRun } from "./tools.js";

export function run(rollupOptions: RollupOptions[] | RollupOptions, commandOptions: CommandOptions): () => Promise<void> {
  async function rollupRun(): Promise<void> {
    await toolRun(rollupOptions, commandOptions);
  }
  rollupRun.displayName = "rollupRun";
  return rollupRun;
}


export function build(options?: DefaultConfigs, commandOptions?: CommandOptions) {
  async function rollupBuild() {
    await toolBuild(options, commandOptions);
    console.log("done");
  }
  rollupBuild.displayName = "rollupBuild";
  return rollupBuild;
}