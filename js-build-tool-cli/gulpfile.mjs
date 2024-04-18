import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";


async function copyDependencies() {
  const dependencies = await tools.getDependencies("../js-build-tool/package.json");
  tools.writeJson("dependencies.json", dependencies);
}

/**
 * @type import("@iiimaddiniii/js-build-tool").ConfigOpts
 */
const rollupOptions = {
  type: "app",
};

export const build = tools.exitAfter(
  copyDependencies,
  rollup.tasks.build(rollupOptions));