import fs from "fs/promises";
import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";

async function updatePnpmLockDependencies() {
  const tmpBuildDir = tools.file(".tmpBuild");
  const srcPackage = tools.file("packageDependencies.json");
  const srcLock = tools.file("pnpm-lockDependencies.yaml");
  const destPackage = tools.file(".tmpBuild/package.json");
  const destLock = tools.file(".tmpBuild/pnpm-lock.yaml");
  const devDeps = await tools.getDevDependencies();
  const packageDeps = await tools.getDependencies(srcPackage);
  let writeFile = false;
  const newPackageDeps = Object.fromEntries(Object.entries(packageDeps).map(([key, value]) => {
    if ((key in devDeps) && (devDeps[key] !== value)) {
      writeFile = true;
      return [key, devDeps[key]];
    }
    return [key, value];
  }));
  if (writeFile) await tools.writeJson(srcPackage, { dependencies: newPackageDeps });
  try { await fs.mkdir(tmpBuildDir); } catch { }
  await fs.copyFile(srcPackage, destPackage);
  await fs.copyFile(srcLock, destLock);
  if (tools.isProd()) {
    await tools.exec({ cwd: tmpBuildDir })`pnpm install --frozen-lockfile --config.confirmModulesPurge=false --node-linker=hoisted --lockfile-only`;
  } else {
    await tools.exec({ cwd: tmpBuildDir })`pnpm install --config.confirmModulesPurge=false --node-linker=hoisted --lockfile-only`;
    await fs.copyFile(destLock, srcLock);
  }
}

let deps = Object.keys((await tools.readJson("packageDependencies.json")).dependencies);
deps.push("typescript");
const bundle = rollup.tasks.build({
  blacklistDevDependencies: false,
  externalDependencies: deps,
  commonjsPlugin: { ignore: ["electron"] },
  treeShakeOptions: {
    moduleSideEffects: false,
  },
  bundleDeclarationPackages: [
    "@schemastore/package",
    "execa",
    "fetch-github-release",
    "@microsoft/api-extractor",
    "@rollup/plugin-terser",
    "gulp",
    "rollup",
    "@rollup/plugin-commonjs",
    "@rollup/plugin-json",
    "@rollup/plugin-node-resolve",
    "@rollup/plugin-typescript",
    "rollup-plugin-include-sourcemaps",
    "@rollup/pluginutils",
    "terser",
    "@octokit/rest",
    "@microsoft/api-extractor-model",
    "@octokit/plugin-rest-endpoint-methods",
    "@octokit/types",
    "@octokit/openapi-types"],
}, { failAfterWarnings: false });

export const clean = tools.exitAfter(tasks.cleanWithGit());
export const build = tools.exitAfter(
  tasks.installDependencies(),
  tools.parallel(bundle, updatePnpmLockDependencies));
export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodInstallDependencies(),
  tools.parallel(bundle, updatePnpmLockDependencies));

export const publishPatch = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodInstallDependencies(),
  tools.parallel(bundle, updatePnpmLockDependencies),
  tasks.incrementVersion(),
  tasks.publishPackage());