import { tools, tasks, rollup } from "@iiimaddiniii/js-build-tool";

/**
 * @type import("@iiimaddiniii/js-build-tool").ConfigOpts
 */
const rollupOptions = {
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
    "@microsoft/api-extractor-model",
    "@electron-forge/core",
    "@electron-forge/shared-types"],
};

export const clean = tools.exitAfter(tasks.cleanWithGit());

export const build = tools.exitAfter(
  tasks.installDependencies(),
  rollup.tasks.build(rollupOptions));

export const buildCi = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodInstallDependencies(),
  rollup.tasks.build(rollupOptions));

export const publishPatch = tools.exitAfter(
  tasks.cleanWithGit(),
  tasks.prodInstallDependencies(),
  rollup.tasks.build(rollupOptions),
  tasks.incrementVersion(),
  tasks.publishPackage());