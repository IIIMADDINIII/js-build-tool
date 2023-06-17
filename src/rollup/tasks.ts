
import type { RollupOptions } from "rollup";
import { setDisplayName } from "../tools/misc.js";
import type { CommandOptions, DefaultConfigs } from "./tools.js";
import * as tools from "./tools.js";

export function run(rollupOptions: RollupOptions[] | RollupOptions, commandOptions: CommandOptions): () => Promise<void> {
  return setDisplayName("rollupRun", async function rollupRun() {
    await tools.run(rollupOptions, commandOptions);
  });
}

export function build(options?: DefaultConfigs, commandOptions?: CommandOptions) {
  return setDisplayName("rollupBuild", async function rollupBuild() {
    await tools.build(options, commandOptions);
  });
}