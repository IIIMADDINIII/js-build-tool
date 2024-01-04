
import type { RollupOptions } from "rollup";
import type { TaskFunction } from "../tools/gulp.js";
import { setDisplayName } from "../tools/misc.js";
import type { CommandOptions } from "./tools.js";
import * as tools from "./tools.js";
import type { ConfigOpts } from "./tools/buildOptions.js";

/**
 * Run Rollup with an custom configuration.
 * Can directly be used as an Rollup Task.
 * @param rollupOptions - Rollup Options wich normally are defined by the rollup.config.js.
 * @param commandOptions - Options wich are normally provided through cli flags.
 * @returns A Gulp Task.
 * @public
 */
export function run(rollupOptions: RollupOptions[] | RollupOptions, commandOptions: CommandOptions): TaskFunction {
  return setDisplayName("rollupRun", async function rollupRun() {
    await tools.run(rollupOptions, commandOptions);
  });
}

/**
 * Build the Project with an automatically generated rollup config.
 * Also bundles the declaration files with ApiExtractor and generate necessary package.json with module types.
 * Can directly be used as an Rollup Task.
 * @param configOpts - options on how the rollup config should be generated.
 * @param commandOptions - optional cli flags for rollup.
 * @returns A Gulp Task.
 * @public
 */
export function build(configOpts?: ConfigOpts, commandOptions?: CommandOptions): TaskFunction {
  return setDisplayName("rollupBuild", async function rollupBuild() {
    await tools.build(configOpts, commandOptions);
  });
}

/**
 * Build the Project with an automatically generated rollup config.
 * Also bundles the declaration files with ApiExtractor and generate necessary package.json with module types.
 * Automatically sets the configOpts.buildTest option to true to build the test files.
 * Can directly be used as an Rollup Task.
 * @param configOpts - options on how the rollup config should be generated.
 * @param commandOptions - optional cli flags for rollup.
 * @returns A Gulp Task.
 * @public
 */
export function buildWithTests(configOpts?: ConfigOpts, commandOptions?: CommandOptions): TaskFunction {
  return setDisplayName("buildWithTests", async function buildWithTests() {
    await tools.buildWithTests(configOpts, commandOptions);
  });
}

/**
 * Build the Project with an automatically generated rollup config.
 * Also bundles the declaration files with ApiExtractor and generate necessary package.json with module types.
 * Automatically sets the configOpts.buildTest option to true to build the test files.
 * Runs Jest with the generated test files after the build finished.
 * Can directly be used as an Rollup Task.
 * @param configOpts - options on how the rollup config should be generated.
 * @param commandOptions - optional cli flags for rollup.
 * @returns A Gulp Task.
 * @public
 */
export function buildAndRunTests(configOpts?: ConfigOpts, commandOptions?: CommandOptions): TaskFunction {
  return setDisplayName("buildAndRunTests", async function buildAndRunTests() {
    await tools.buildAndRunTests(configOpts, commandOptions);
  });
}
