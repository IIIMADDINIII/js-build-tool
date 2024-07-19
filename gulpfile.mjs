import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";

export const clean = tools.exitAfter(tasks.cleanWithGit());

export const build = tools.exitAfter(
  tasks.installDependencies(),
  tasks.runScriptsInPackages({ "**": "build" }));

export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodInstallDependencies(),
  tasks.runScriptsInPackages({ "**": "build" }));

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
}

export async function publish() {
  await tools.prodInstallDependencies();
  await tools.runScriptsInPackages({ "**": "build" });
  tasks.ensureGitIsClean();
  await version();
  await tools.exec`pnpm -r publish`;
}