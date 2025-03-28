import type { Config, RuntimeOutputConfig } from "@lit/localize-tools/lib/config.js";
import type { XliffConfig } from "@lit/localize-tools/lib/types/formatters.js";
import type { Locale } from "@lit/localize-tools/lib/types/locale.js";
import { dirname, relative, resolve } from "path";
import { RuntimeLitLocalizer } from "../lateImports.js";
import { file, fs, write, writeJson } from "./file.js";
import { readPackageJson } from "./package.js";
import { projectPath } from "./paths.js";

/**
 * Options for @lit/localize-tools.
 * @public
 */
export interface LitLocalizeConfig {
  /**
   * Base directory where the Paths a resolved against.
   * Defaults to "." when used with buildTranslationSource.
   * ".." is used with buildTranslationPackage.
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
   * Defaults to "./translations" if used with buildTranslationSource.
   * "./locales/translations" is used as the default with buildTranslationPackage.
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
   * 
   * Defaults to "ts" when used with buildTranslationSource.
   * "js" is used as the default with buildTranslationPackage.
   * @default "js"
   */
  language?: 'js' | 'ts';
  /**
   * Output directory for generated modules. Into this directory will be
   * generated a <locale>.ts for each `targetLocale`, each a module that exports
   * the translations in that locale keyed by message ID.
   * 
   * Defaults to "./src/locales" if used with buildTranslationSource.
   * "./locales/dist" is used as default with buildTranslationPackage.
   */
  outputDir?: string;
}

/**
 * Resolves a Config to a valid LitLocalizeConfig.
 * @param config - the Config to Resolve.
 * @returns the resolved Config.
 */
async function resolveLitLocalizeConfig(config?: LitLocalizeConfig, source: boolean = false): Promise<Config & { interchange: XliffConfig; output: RuntimeOutputConfig; }> {
  const baseDir = resolve(projectPath, config?.baseDir === undefined ? source ? "." : ".." : config?.baseDir);
  const sourceLocale = config?.sourceLocale || "en-x-dev";
  const interchange: XliffConfig = {
    format: "xliff",
    xliffDir: source ? "./translations" : "./locales/translations",
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
      outputDir: source ? "./src/locales" : "./locales/dist",
      language: source ? "ts" : "js",
      ...config?.output
    },
  };
}

async function litLocalizeExtract(config?: LitLocalizeConfig, source: boolean = false): Promise<void> {
  const localizer = new (await RuntimeLitLocalizer()).RuntimeLitLocalizer(await resolveLitLocalizeConfig(config, source));
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
 * Extract the Translation Messages using @lit/localize-tools extract command.
 * Used defaults from buildTranslationPackage.
 * Only Runtime Mode is Supported.
 * @param config - The config for @lit/localize-tools.
 * @public
 */
export async function litLocalizeExtractPackage(config?: LitLocalizeConfig): Promise<void> {
  await litLocalizeExtract(config, false);
}

/**
 * Extract the Translation Messages using @lit/localize-tools extract command.
 * Used defaults from buildTranslationSource.
 * Only Runtime Mode is Supported.
 * @param config - The config for @lit/localize-tools.
 * @public
 */
export async function litLocalizeExtractSource(config?: LitLocalizeConfig): Promise<void> {
  await litLocalizeExtract(config, true);
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
export async function transformTranslationFilesToUseDependencyInjection(translationDir: string, sourceLocale: string): Promise<void> {
  let isTs = false;
  let imports: string[] = [];
  let exports: string[] = [];
  let index = 0;
  await Promise.all((await fs.readdir(translationDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && (e.name.endsWith(".js") || (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts"))))
    .map(async ({ name }) => {
      const withoutExtension = name.slice(0, -3);
      if (withoutExtension === "index") return;
      const file = resolve(translationDir, name);
      let content = await fs.readFile(file, { encoding: "utf8" });
      // Replace all import statements with an empty string
      content = content.replaceAll(/^[^\S\r\n]*import[^\r\n]*$/mg, "");
      // Find export and surround it with a function
      if (name.endsWith("js")) {
        content = content.replace(/^[^\S\r\n]*export([\s\S]*)/mg, `let cache = undefined;\nexport function templates(str, html) {\n  if (cache !== undefined) return cache;\n $1cache = {templates};\n  return cache;\n}`);
      } else {
        content = content.replace(/^[^\S\r\n]*export([\s\S]*)/mg, `let cache: import("@lit/localize").LocaleModule | undefined  = undefined;\n//@ts-ignore\nexport function templates(str: typeof import("@lit/localize").str, html: typeof import("lit").html): import("@lit/localize").LocaleModule {\n  if (cache !== undefined) return cache;\n $1cache = {templates};\n  return cache;\n}`);
        isTs = true;
      }
      await write(file, content);
      imports.push(`import { templates as l${index} } from "./${withoutExtension}.js";`);
      exports.push(`  "${withoutExtension}": l${index},`);
      index++;
    }));
  const indexFile = resolve(translationDir, isTs ? "index.ts" : "index.js");
  const content = `${imports.join("\n")}\nexport const locales = {\n${exports.join("\n")}\n};\nexport const sourceLocale = "${sourceLocale}";`;
  await write(indexFile, content);
}

/**
 * Content of the declarations files for translation files.
 */
const TRANSLATION_DECLARATION_SOURCE = `type StrResult = { strTag: true; strings: TemplateStringsArray; values: unknown[]; };
type StrFn = (strings: TemplateStringsArray, ...values: unknown[]) => StrResult;
type TemplateResult = { ['_$litType$']: 1; strings: TemplateStringsArray; values: unknown[]; };
type HtmlFn = (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult;
type TemplateLike = string | TemplateResult | StrResult;
type TemplateMap = { [id: string]: TemplateLike; };
type LocaleModule = { templates: TemplateMap; };
export function templates(str: StrFn, html: HtmlFn): LocaleModule;`;

/**
 * Sets the exports field of a Package.json file to the files in the translationDir.
 * @param translationDir - folder with the Translation files to write to the Exports field.
 * @public
 */
export async function writePackageJsonExportsAndDeclarations(translationDir: string, sourceLocale: string) {
  const packageFile = file("package.json");
  const names = (await fs.readdir(translationDir, { withFileTypes: true }))
    .filter((e) => e.isFile() && (e.name.endsWith(".js")))
    .map(({ name }) => ({ name, withoutExtension: name.slice(0, -3) }));
  const declarationLines = names
    .filter(({ withoutExtension }) => withoutExtension !== "index")
    .map(({ name, withoutExtension }) => `  "${withoutExtension}": typeof import("./${name}").templates;`);
  const indexDeclarationSource = `export const locales: {\n${declarationLines.join("\n")}\n};\nexport const sourceLocale: "${sourceLocale}";`;
  const entries = await Promise.all(names.map(async ({ name, withoutExtension }) => {
    const isIndex = name === "index.js";
    const relativePath = "./" + relative(dirname(packageFile), resolve(translationDir, name)).replaceAll("\\", "/");
    const key = isIndex ? "." : "./" + withoutExtension;
    const typesFile = resolve(translationDir, withoutExtension + ".d.ts");
    const relativeTypes = "./" + relative(dirname(packageFile), typesFile).replaceAll("\\", "/");
    const declarationContent = isIndex ? indexDeclarationSource : TRANSLATION_DECLARATION_SOURCE;
    await write(typesFile, declarationContent);
    const value = {
      import: {
        types: relativeTypes,
        default: relativePath
      }
    };
    return [key, value];
  }));
  const exports = Object.fromEntries(entries);
  const pack = await readPackageJson(packageFile);
  pack.exports = exports;
  await writeJson(packageFile, pack, true);
}

/**
 * Calls litLocalizeBuild, transformTranslationFilesToUseDependencyInjection and writePackageJsonExports.
 * Will generate a folder dist with a file for every translation, when called from a sub package named localize with default values.
 * Also Converts the generated output from litLocalizeBuild to use dependency injection (a function named templates is exported wich needs to be called with a str and html templateTag implementation as augments).
 * @param config - configuration of the litLocalizeBuild.
 * @public
 */
export async function buildTranslationPackage(config?: LitLocalizeConfig): Promise<void> {
  const conf = await resolveLitLocalizeConfig({ baseDir: "..", ...config }, false);
  await litLocalizeBuild({ baseDir: "..", ...config });
  const translationDir = conf.resolve(conf.output.outputDir);
  await transformTranslationFilesToUseDependencyInjection(translationDir, conf.sourceLocale);
  await writePackageJsonExportsAndDeclarations(translationDir, conf.sourceLocale);
}

/**
 * Calls litLocalizeBuild and transformTranslationFilesToUseDependencyInjection.
 * Will generate a folder locales inside src with a file for every translation, when called with default values.
 * Also Converts the generated output from litLocalizeBuild to use dependency injection (a function named templates is exported wich needs to be called with a str and html templateTag implementation as augments).
 * @param config - configuration of the litLocalizeBuild.
 * @public
 */
export async function buildTranslationSource(config?: LitLocalizeConfig): Promise<void> {
  const conf = await resolveLitLocalizeConfig(config, true);
  await litLocalizeBuild(conf);
  const translationDir = conf.resolve(conf.output.outputDir);
  await transformTranslationFilesToUseDependencyInjection(translationDir, conf.sourceLocale);
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