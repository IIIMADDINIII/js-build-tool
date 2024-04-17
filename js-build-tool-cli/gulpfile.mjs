import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";

/**
 * @type import("@iiimaddiniii/js-build-tool").ConfigOpts
 */
const rollupOptions = {
  type: "app",
};

export const clean = tools.exitAfter(tasks.cleanWithGit());

export const build = tools.exitAfter(
  tasks.installDependencies(),
  rollup.tasks.build(rollupOptions));

export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodInstallDependencies(),
  rollup.tasks.build(rollupOptions));