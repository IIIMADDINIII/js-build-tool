import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";

export const clean = tools.exitAfter(tasks.cleanWithGit());

export const build = tools.exitAfter(
  tasks.installDependencies(),
  tools.parallel(tasks.runWorkspaceScript("build", "./js-build-tool"), tasks.runWorkspaceScript("build", "./js-build-tool-cli")),
  tasks.runWorkspaceScript("build", "./js-build-tool-types"));

export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodInstallDependencies(),
  tools.parallel(tasks.runWorkspaceScript("build", "./js-build-tool"), tasks.runWorkspaceScript("build", "./js-build-tool-cli")),
  tasks.runWorkspaceScript("build", "./js-build-tool-types"));