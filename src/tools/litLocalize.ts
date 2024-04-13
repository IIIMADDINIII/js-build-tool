import { resolve } from "path";
import { pathToFileURL } from "url";
import { buildToolDependenciesPath, projectPath } from "./paths.js";

/**
 * Options for @lit/localize-tools.
 * @public
 */
export interface LitConfig {
  /**
   * Locale code that messages in the source code are written in.
   * @default "en"
   */
  sourceLocale?: string;
  /**
   * Locale codes that messages will be localized to.
   * @default ["en"]
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
  interchange?: XlbConfig | XliffConfig;
  /**
   * Set and configure the output mode.
   * @default {language: "js", outputDir: "./locales"}
   */
  output?: OutputConfig;
}

/**
 * Parse an XLB XML file. These files contain translations organized using the
 * same message names that we originally requested.
 * Configuration for XLB interchange format.
 * @public
 */
export interface XlbConfig {
  /**
   * Format of the Translation files to use.
   * "xliff" | "xlb"
   * @default "xliff"
   */
  format: 'xlb';
  /**
   * Output path on disk to the XLB XML file that will be created containing all
   * messages extracted from the source. E.g. "data/localization/en.xlb".
   * @default "./translations"
   */
  outputFile?: string;
  /**
   * Glob pattern of XLB XML files to read from disk containing translated
   * messages. E.g. "data/localization/*.xlb".
   *
   * See https://github.com/isaacs/node-glob#README for valid glob syntax.
   * @default ".\/translations\/**\/*"
   */
  translationsGlob?: string;

}

/**
 * Configuration for XLIFF interchange format.
 * @public
 */
export interface XliffConfig {
  /**
   * Format of the Translation files to use.
   * "xliff" | "xlb"
   * @default "xliff"
   */
  format: 'xliff';
  /**
   * Directory on disk to read/write .xlf XML files. For each target locale,
   * the file path "<xliffDir>/<locale>.xlf" will be used.
   * @default "./translations"
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
   * @default "./locales"
   */
  outputDir?: string;
}

/**
 * Resolves a Config to a valid LitLocalizeConfig.
 * @param config - the Config to Resolve.
 * @returns the resolved Config.
 */
function resolveLitLocalizeConfig(config?: LitConfig): unknown {
  return {
    baseDir: projectPath,
    resolve: (path: string) => resolve(projectPath, path),
    sourceLocale: (config?.sourceLocale || "en"),
    targetLocales: (config?.targetLocales || ["en"]),
    inputFiles: config?.inputFiles || [".\/**\/src\/**\/*"],
    interchange: config?.interchange?.format === "xlb" ? {
      outputFile: "./translations",
      translationsGlob: ".\/translations\/**\/*",
      ...config?.interchange
    } : {
      format: "xliff",
      xliffDir: "./translations",
      placeholderStyle: "x",
      ...config?.interchange
    },
    output: {
      mode: "runtime",
      outputDir: "./locales",
      language: "js",
      ...config?.output
    },
  };
}

/**
 * Extract the Translation Messages using @lit/localize-tools extract command.
 * Only Runtime Mode is Supported.
 * @param config - The config for @lit/localize-tools.
 */
export async function litLocalizeExtract(config?: LitConfig): Promise<void> {
  if (buildToolDependenciesPath === undefined) throw new Error("Build Tool dependencies not found.");
  let RuntimeLitLocalizer: (new (config: unknown) => { extractSourceMessages(): { messages: unknown[], errors: unknown[]; }; writeInterchangeFiles(): Promise<void>; }) | undefined = undefined;
  try {
    RuntimeLitLocalizer = (await import(pathToFileURL(resolve(buildToolDependenciesPath, "node_modules", "@lit", "localize-tools", "lib", "modes", "runtime.js")).toString()))?.RuntimeLitLocalizer;
  } catch (e) {
    console.log("error", e);
    throw new Error("Build Tool dependencies not found.");
  }
  if (RuntimeLitLocalizer === undefined) throw new Error("Build Tool dependencies not found.");
  const localizer = new RuntimeLitLocalizer(resolveLitLocalizeConfig(config));
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
 */
export async function litLocalizeBuild(config?: LitConfig): Promise<void> {
  if (buildToolDependenciesPath === undefined) throw new Error("Build Tool dependencies not found.");
  let RuntimeLitLocalizer: (new (config: unknown) => { validateTranslations(): { errors: unknown[]; }; build(): Promise<void>; }) | undefined = undefined;
  try {
    RuntimeLitLocalizer = (await import(pathToFileURL(resolve(buildToolDependenciesPath, "node_modules", "@lit", "localize-tools", "lib", "modes", "runtime.js")).toString()))?.RuntimeLitLocalizer;
  } catch {
    throw new Error("Build Tool dependencies not found.");
  }
  if (RuntimeLitLocalizer === undefined) throw new Error("Build Tool dependencies not found.");
  const localizer = new RuntimeLitLocalizer(resolveLitLocalizeConfig(config));
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