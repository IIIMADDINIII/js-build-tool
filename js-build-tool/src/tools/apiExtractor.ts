import { type IConfigFile } from "@microsoft/api-extractor";
import { apiExtractor } from "../lateImports.js";

/**
 * Runs the {@link https://api-extractor.com/ | ApiExtractor}.
 * @param projectPackageJsonPath - path to the package.json file
 * @param options - the {@link https://api.rushstack.io/pages/api-extractor.iextractorconfigprepareoptions/ | IExtractorConfigPrepareOptions} of the APIExtractor.
 * @public
 */
export async function runApiExtrator(projectPackageJsonPath: string, options: IConfigFile): Promise<void> {
  const configObject: IConfigFile = {
    messages: {
      compilerMessageReporting: { default: { logLevel: (await apiExtractor()).ExtractorLogLevel.Warning } },
      extractorMessageReporting: { default: { logLevel: (await apiExtractor()).ExtractorLogLevel.Warning } },
      tsdocMessageReporting: { default: { logLevel: (await apiExtractor()).ExtractorLogLevel.Warning } },
    },
    ...options
  };
  const extractorConfig = (await apiExtractor()).ExtractorConfig.prepare({ configObject, configObjectFullPath: projectPackageJsonPath, packageJsonFullPath: projectPackageJsonPath });
  const extractorResult = (await apiExtractor()).Extractor.invoke(extractorConfig, {});
  if (extractorResult.succeeded) return console.log('API Extractor completed successfully');
  if (extractorResult.errorCount == 0) return console.warn('API Extractor completed with warnings');
  console.error('API Extractor completed with errors');
  throw new Error('API Extractor completed with errors');
}

