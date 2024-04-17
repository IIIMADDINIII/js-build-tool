
import { tools, tasks } from "@iiimaddiniii/js-build-tool";

async function createIndexDts() {
  const oldFileContent = await tools.read("./node_modules/@iiimaddiniii/js-build-tool/dist/index.d.ts");
  const indexOfFirstImport = oldFileContent.indexOf("import ") - 1;
  const module = oldFileContent.substring(indexOfFirstImport);
  const newFileContent = `
declare module "consts:production" {
  let production: boolean;
  export default production;
}
declare module "consts:development" {
  let development: boolean;
  export default development;
}
declare module "consts:testing" {
  let testing: boolean;
  export default testing;
}

declare module "@iiimaddiniii/js-build-tool" {
${module}
}
  `;
  await tools.write("./index.d.ts", newFileContent);
}

async function synchronizePackageVersion() {
  const version = await tools.getPackageVersion("./node_modules/@iiimaddiniii/js-build-tool/package.json");
  await tools.exec`pnpm version --allow-same-version ${version}`;
}

async function updatePackages() {
  await tools.exec`pnpm update --latest`;
}

export const clean = tools.exitAfter(tasks.cleanWithGit());

export const build = tools.exitAfter(
  tasks.installDependencies(),
  updatePackages,
  tasks.createCommit({ message: "Update Dependencies", all: true }),
  createIndexDts);

export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.installDependencies(),
  updatePackages,
  tasks.createCommit({ message: "Update Dependencies", all: true }),
  createIndexDts);

export const publishPackage = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.installDependencies(),
  updatePackages,
  tasks.createCommit({ message: "Update Dependencies", all: true }),
  createIndexDts,
  synchronizePackageVersion,
  tasks.publishPackage());