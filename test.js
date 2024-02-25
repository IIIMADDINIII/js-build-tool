
/**
   * @param {string} string 
   * @returns {string}
   */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const excludeExtensions = [".d.ts", ".d.ts.map", ".js.map", ".cjs.map", ".mjs.map"];
const includeOnMainLevel = ["main", "package.json", "dist"];
const subPackagesToExclude = ["common"];
const includeInSubPackage = ["dist", "package.json", "html"];

function generateIgnores() {
  let extensions = excludeExtensions.map((value) => RegExp("^.*" + escapeRegExp(value) + "$"));
  let mainInclude = RegExp("^\\/" + includeOnMainLevel.map((value) => "(?!" + escapeRegExp(value) + "(\\/|$))").join("") + ".*$");
  let subPackagesExclude = subPackagesToExclude.map((value) => RegExp("^\\/main\\/node_modules\\/@app\\/" + escapeRegExp(value) + "$"));
  let includeInMainPackage = RegExp("^\\/main\\/" + ["node_modules", ...includeInSubPackage].map((value) => "(?!" + escapeRegExp(value) + "(\\/|$))").join("") + ".*$");
  let onlyAppInMainModules = /^\/main\/node_modules\/(?!@app(\/|$)).*$/;
  let includeInPackage = RegExp("^\\/main\\/node_modules\\/@app\\/[^\\/]*\\/" + includeInSubPackage.map((value) => "(?!" + escapeRegExp(value) + "(\\/|$))").join("") + ".*$");
  return [...extensions, mainInclude, ...subPackagesExclude, includeInMainPackage, onlyAppInMainModules, includeInPackage];
}
const ignores = generateIgnores();

const config = {
  packagerConfig: {
    ignore: ignores,
    asar: true,
    derefSymlinks: true,
  },
};



import fs from 'fs-extra';
import * as module from "module";
import { api } from "@electron-forge/core";
import { resolve } from "path";
const require = module.createRequire(import.meta.url);

async function runPackage(config) {
  const origExists = fs.pathExists;
  const target = resolve(process.cwd(), "forge.config.js");
  fs.pathExists = function pathExists(file, cb) {
    if (file === target) {
      return Promise.resolve(true);
    }
    return origExists(file, cb);
  };
  require.cache[target] = { exports: config };
  module._pathCache[target + "\x00"] = target;
  await api.package({});
}

runPackage(config).then(process.exit).catch((e) => { console.error(e); process.exit(-1); });