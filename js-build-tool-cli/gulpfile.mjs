import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";


async function copyDependencies() {
  const dependencies = await tools.getDependencies("../js-build-tool/package.json");
  const onlyBuiltDependencies = (await tools.readPackageJson("../package.json"))?.pnpm?.onlyBuiltDependencies;
  tools.writeJson("install.json", { dependencies, pnpm: { onlyBuiltDependencies } });
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