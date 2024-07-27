
/**
 * Returns a function wich caches the result of the specified import.
 * @param specifier - what to import.
 * @returns the function wich will import it.
 */
function createCachedImportFunction<T>(specifier: string): () => Promise<T> {
  let cache: unknown = undefined;
  return async function cachedImport() {
    if (cache === undefined) cache = await import(specifier);
    return cache as T;
  };
}

export const rollupJs = createCachedImportFunction<typeof import("rollup/dist/shared/rollup.js")>("rollup/dist/shared/rollup.js");
export const parseAst_js = createCachedImportFunction<typeof import("rollup/dist/shared/parseAst.js")>("rollup/dist/shared/parseAst.js");
export const getLoadConfigFileJs = createCachedImportFunction<typeof import("rollup/dist/shared/loadConfigFile.js")>("rollup/dist/shared/loadConfigFile.js");
export const apiExtractor = createCachedImportFunction<typeof import("@microsoft/api-extractor")>("@microsoft/api-extractor");
export const yaml = createCachedImportFunction<typeof import("yaml")>("yaml");
export const commonjs = createCachedImportFunction<typeof import("@rollup/plugin-commonjs")>("@rollup/plugin-commonjs");
export const json = createCachedImportFunction<typeof import("@rollup/plugin-json")>("@rollup/plugin-json");
export const nodeResolve = createCachedImportFunction<typeof import("@rollup/plugin-node-resolve")>("@rollup/plugin-node-resolve");
export const terser = createCachedImportFunction<typeof import("@rollup/plugin-terser")>("@rollup/plugin-terser");
export const typescript = createCachedImportFunction<typeof import("@rollup/plugin-typescript")>("@rollup/plugin-typescript");
export const fastGlob = createCachedImportFunction<{ default: typeof import("fast-glob"); }>("fast-glob");
export const consts = createCachedImportFunction<typeof import("rollup-plugin-consts")>("rollup-plugin-consts");
export const sourceMaps = createCachedImportFunction<typeof import("rollup-plugin-include-sourcemaps")>("rollup-plugin-include-sourcemaps");
export const MakerZIP = createCachedImportFunction<typeof import("@electron-forge/maker-zip")>("@electron-forge/maker-zip");
export const MakerWix = createCachedImportFunction<typeof import("@electron-forge/maker-wix")>("@electron-forge/maker-wix");
export const FusesPlugin = createCachedImportFunction<typeof import("@electron-forge/plugin-fuses")>("@electron-forge/plugin-fuses");
export const fuses = createCachedImportFunction<typeof import("@electron/fuses")>("@electron/fuses");
export const forge = createCachedImportFunction<typeof import("@electron-forge/core")>("@electron-forge/core");
export const fetchGithubRelease = createCachedImportFunction<typeof import("fetch-github-release")>("fetch-github-release");
export const RuntimeLitLocalizer = createCachedImportFunction<typeof import("@lit/localize-tools/lib/modes/runtime.js")>("@lit/localize-tools/lib/modes/runtime.js");
export const minimatch = createCachedImportFunction<typeof import("minimatch")>("minimatch");
export const chalk = createCachedImportFunction<typeof import("chalk")>("chalk");
export const rollupUrl = createCachedImportFunction<typeof import("@rollup/plugin-url")>("@rollup/plugin-url");

