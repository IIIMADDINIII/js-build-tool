
import type { RollupOptions } from "rollup";
import { setDisplayName } from "../tools/misc.js";
import type { CommandOptions } from "./tools.js";
import * as tools from "./tools.js";
import type { ConfigOpts } from "./tools/buildOptions.js";

export function run(rollupOptions: RollupOptions[] | RollupOptions, commandOptions: CommandOptions): () => Promise<void> {
  return setDisplayName("rollupRun", async function rollupRun() {
    await tools.run(rollupOptions, commandOptions);
  });
}

export function build(configOpts?: ConfigOpts, commandOptions?: CommandOptions) {
  return setDisplayName("rollupBuild", async function rollupBuild() {
    await tools.build(configOpts, commandOptions);
  });
}

export function buildWithTests(configOpts?: ConfigOpts, commandOptions?: CommandOptions) {
  return setDisplayName("buildWithTests", async function buildWithTests() {
    await tools.buildWithTests(configOpts, commandOptions);
  });
}

export function buildAndRunTests(configOpts?: ConfigOpts, commandOptions?: CommandOptions) {
  return setDisplayName("buildAndRunTests", async function buildAndRunTests() {
    await tools.buildWithTests(configOpts, commandOptions);
  });
}
