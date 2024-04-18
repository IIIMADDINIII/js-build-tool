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

export async function version() {
  let arg = process.argv.at(-1);
  if (arg === undefined || !arg.startsWith("--")) arg = "--patch";
  arg = arg.slice(2);
  await tools.exec()`pnpm version -f --no-git-tag-version ${arg}`;
  const version = await tools.getPackageVersion(undefined, false);
  if (version === undefined) throw new Error("Could not Read main package Version.");
  await Promise.all([
    tools.exec({ cwd: tools.file("./js-build-tool") })`pnpm version -f --no-git-tag-version ${version}`,
    tools.exec({ cwd: tools.file("./js-build-tool-cli") })`pnpm version -f --no-git-tag-version ${version}`,
    tools.exec({ cwd: tools.file("./js-build-tool-types") })`pnpm version -f --no-git-tag-version ${version}`,
  ]);
  await tools.createCommit({ message: `v${version}`, all: true });
  await exec`git tag -m v${version} v${version}`;
}