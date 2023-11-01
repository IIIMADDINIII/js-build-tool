import { Extractor, ExtractorConfig, ExtractorLogLevel, IConfigFile } from "@microsoft/api-extractor";
import { resolve } from "path";
import { resolveModule } from "./misc.js";

export function runApiExtrator(projectPackageJsonPath: string, options: IConfigFile): void {
  const configObject: IConfigFile = {
    messages: {
      compilerMessageReporting: { default: { logLevel: ExtractorLogLevel.Warning } },
      extractorMessageReporting: { default: { logLevel: ExtractorLogLevel.Warning } },
      tsdocMessageReporting: { default: { logLevel: ExtractorLogLevel.Warning } },
    },
    ...options
  };
  const extractorConfig = ExtractorConfig.prepare({ configObject, configObjectFullPath: projectPackageJsonPath, packageJsonFullPath: projectPackageJsonPath });
  const extractorResult = Extractor.invoke(extractorConfig, {
    typescriptCompilerFolder: resolve(resolveModule("typescript"), "../.."),
  });
  if (extractorResult.succeeded) return console.log('API Extractor completed successfully');
  if (extractorResult.errorCount == 0) return console.warn('API Extractor completed with warnings');
  console.error('API Extractor completed with errors');
  throw new Error('API Extractor completed with errors');
}

