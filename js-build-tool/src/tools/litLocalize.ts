import type { Config, RuntimeOutputConfig } from "@lit/localize-tools/lib/config.js";
import type { XliffConfig } from "@lit/localize-tools/lib/types/formatters.js";
import type { Locale } from "@lit/localize-tools/lib/types/locale.js";
import { dirname, relative, resolve } from "path";
import { RuntimeLitLocalizer } from "../lateImports.js";
import { file, fs, writeJson } from "./file.js";
import { readPackageJson } from "./package.js";
import { projectPath } from "./paths.js";

/**
 * Options for @lit/localize-tools.
 * @public
 */
export interface LitLocalizeConfig {
  /**
   * Base directory where the Paths a resolved against.
   */
  baseDir?: string;
  /**
   * Locale code that messages in the source code are written in.
   * @default "en-x-dev"
   */
  sourceLocale?: string;
  /**
   * Locale codes that messages will be localized to.
   * Will look at the files in the Translations folder and use the file names as targetLocales.
   * If the folder does not exist will output sourceLocale (excluding -x-dev if it exists).
   */
  targetLocales?: string[];
  /**
   * Array of filenames or glob patterns to extract messages from.
   * @default [".\/**\/src\/**\/*"]
   */
  inputFiles?: string[];
  /**
   * Localization interchange format and configuration specific to that format.
   */
  interchange?: LitXliffConfig;
  /**
   * Set and configure the output mode.
   * @default {language: "js", outputDir: "./locales/dist"}
   */
  output?: OutputConfig;
}

/**
 * Configuration for XLIFF interchange format.
 * @public
 */
export interface LitXliffConfig {
  /**
   * Directory on disk to read/write .xlf XML files. For each target locale,
   * the file path "<xliffDir>/<locale>.xlf" will be used.
   * @default "./locales/translations"
   */
  xliffDir?: string;
  /**
   * How to represent placeholders containing HTML markup and dynamic
   * expressions. Different localization tools and services have varying support
   * for placeholder syntax.
   *
   * Defaults to "x". Options:
   *
   * - "x": Emit placeholders using <x> tags. See
   *   http://docs.oasis-open.org/xliff/v1.2/os/xliff-core.html#x
   *
   * - "ph": Emit placeholders using <ph> tags. See
   *   http://docs.oasis-open.org/xliff/v1.2/os/xliff-core.html#ph
   * @default "x"
   */
  placeholderStyle?: 'x' | 'ph';
}

/**
 * Configuration specific to the `runtime` output mode.
 * @public
 */
export interface OutputConfig {
  /**
   * Language for emitting generated modules. Defaults to "js" unless a
   * `tsConfig` was specified, in which case it defaults to "ts".
   *
   * - "js": Emit JavaScript modules with ".js" file extension.
   * - "ts": Emit TypeScript modules with ".ts" file extension.
   * @default "js"
   */
  language?: 'js' | 'ts';
  /**
   * Output directory for generated modules. Into this directory will be
   * generated a <locale>.ts for each `targetLocale`, each a module that exports
   * the translations in that locale keyed by message ID.
   * @default "./locales/dist"
   */
  outputDir?: string;
}

/**
 * Resolves a Config to a valid LitLocalizeConfig.
 * @param config - the Config to Resolve.
 * @returns the resolved Config.
 */
async function resolveLitLocalizeConfig(config?: LitLocalizeConfig): Promise<Config & { interchange: XliffConfig; output: RuntimeOutputConfig; }> {
  const baseDir = resolve(projectPath, config?.baseDir === undefined ? "" : config?.baseDir);
  const sourceLocale = config?.sourceLocale || "en-x-dev";
  const interchange: XliffConfig = {
    format: "xliff",
    xliffDir: "./locales/translations",
    placeholderStyle: "x",
    ...config?.interchange
  };
  const res = (path: string) => resolve(baseDir, path);
  return {
    baseDir,
    resolve: res,
    sourceLocale: sourceLocale as Locale,
    targetLocales: (config?.targetLocales || await detectLocalesFromTranslationDir(res(interchange.xliffDir), sourceLocale)) as Locale[],
    inputFiles: config?.inputFiles || [".\/**\/src\/**\/*"],
    interchange,
    output: {
      mode: "runtime",
      outputDir: "./locales/dist",
      language: "js",
      ...config?.output
    },
  };
}

/**
 * Extract the Translation Messages using @lit/localize-tools extract command.
 * Only Runtime Mode is Supported.
 * @param config - The config for @lit/localize-tools.
 * @public
 */
export async function litLocalizeExtract(config?: LitLocalizeConfig): Promise<void> {
  //    RuntimeLitLocalizer = (await import(pathToFileURL(resolve(buildToolDependenciesPath, "node_modules", "@lit", "localize-tools", "lib", "modes", "runtime.js")).toString()))?.RuntimeLitLocalizer;
  const localizer = new (await RuntimeLitLocalizer()).RuntimeLitLocalizer(await resolveLitLocalizeConfig(config));
  const { messages, errors } = localizer.extractSourceMessages();
  console.log('Extracting messages');
  if (errors.length > 0) {
    console.error(errors);
    throw new Error('Error analyzing program');
  }
  console.log(`Extracted ${messages.length} messages`);
  console.log(`Writing interchange files`);
  await localizer.writeInterchangeFiles();
}

/**
 * Generate the Translation files using @lit/localize-tools build command.
 * Only Runtime Mode is Supported.
 * @param config - The config for @lit/localize-tools.
 * @public
 */
export async function litLocalizeBuild(config?: LitLocalizeConfig): Promise<void> {
  const localizer = new (await RuntimeLitLocalizer()).RuntimeLitLocalizer(await resolveLitLocalizeConfig(config));
  console.log('Building');
  const { errors } = localizer.validateTranslations();
  if (errors.length > 0) {
    throw new Error(
      'One or more localized templates contain a set of placeholders ' +
      '(HTML or template literal expressions) that do not exactly match ' +
      'the source code, aborting. Details:\n\n' +
      errors.join('\n')
    );
  }
  await localizer.build();
}

/**
 * Transforms the Translation Files to use Dependency injection instead of importing str and html template tags.
 * @param translationDir - folder with the Translation files to transform.
 * @public
 */
export async function transformTranslationFilesToUseDependencyInjection(translationDir: string): Promise<void> {
  await Promise.all((await fs.readdir(translationDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.endsWith(".js"))
    .map(async ({ name }) => {
      const file = resolve(translationDir, name);
      let content = await fs.readFile(file, { encoding: "utf8" });
      // Replace all import statements with an empty string
      content = content.replaceAll(/^[^\S\r\n]*import[^\r\n]*$/mg, "");
      // Find export and surround it with a function 
      content = content.replace(/^[^\S\r\n]*export([\s\S]*)/mg, "let cache = undefined;\nexport function templates(str, html) {\n  if (cache !== undefined) return cache;\n $1cache = {templates};\n  return cache;\n}");
      await fs.writeFile(file, content);
    }));
}

/**
 * Sets the exports field of a Package.json file to the files in the translationDir.
 * @param translationDir - folder with the Translation files to write to the Exports field.
 * @public
 */
export async function writePackageJsonExports(translationDir: string) {
  const packageFile = file("package.json");
  const entries = (await fs.readdir(translationDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.endsWith(".js"))
    .map(({ name }) => {
      const relativePath = "./" + relative(dirname(packageFile), resolve(translationDir, name)).replaceAll("\\", "/");
      const key: string = "./" + name.slice(0, -3);
      const value = {
        import: {
          default: relativePath
        }
      };
      return [key, value];
    });
  const exports = Object.fromEntries(entries);
  const pack = await readPackageJson(packageFile);
  pack.exports = exports;
  await writeJson(packageFile, pack, true);
}


/**
 * Calls litLocalizeBuild, transformTranslationFilesToUseDependencyInjection and writePackageJsonExports.
 * Also overrides the baseDir default to "..".
 * Will generate a folder dist with a file for every translation, when called from a sub package named localize with default values.
 * Also Converts the generated output from litLocalizeBuild to use dependency injection (a function named templates is exported wich needs to be called with a str and html templateTag implementation as augments).
 * @param config - configuration of the litLocalizeBuild.
 * @public
 */
export async function buildTranslationPackage(config?: LitLocalizeConfig): Promise<void> {
  const conf = await resolveLitLocalizeConfig({ baseDir: "..", ...config });
  await litLocalizeBuild({ baseDir: "..", ...config });
  const translationDir = conf.resolve(conf.output.outputDir);
  await transformTranslationFilesToUseDependencyInjection(translationDir);
  await writePackageJsonExports(translationDir);
}

/**
 * Will strip the -x-dev suffix from a locale, if it exists.
 * @param locale - the locale to strip.
 * @public
 */
export function stripXDevFromLocale(locale: string): string {
  if (!locale.endsWith("-x-dev")) return locale;
  return locale.slice(0, -6);
}

/**
 * Automatically generate a list of translation targets based on the files in the translation dir.
 * @param translationDir - directory where the Translations are Stored (default = "./locales/translations/")
 * @public
 */
export async function detectLocalesFromTranslationDir(xliffDir: string, sourceLocale: string): Promise<string[]> {
  const locales = (await fs.readdir(xliffDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.endsWith(".xlf"))
    .map((e) => e.name.slice(0, -4));
  if (locales.length === 0) locales.push(stripXDevFromLocale(sourceLocale));
  return locales;
}