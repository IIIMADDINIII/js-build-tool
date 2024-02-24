//import { Extractor, ExtractorConfig, ExtractorLogLevel, type IConfigFile } from "@microsoft/api-extractor";
import { Extractor, ExtractorConfig, type ExtractorLogLevel as ExtractorLogLevelType, type IConfigFile } from "@microsoft/api-extractor";

// ToDo: Remove this as soon api-extractor is fixed to include not const enum
// Uncomment first line and remove second line
const ExtractorLogLevel: { [Key in "Error" | "Warning" | "Info" | "Verbose" | "None"]: ExtractorLogLevelType; } = {
  //@ts-ignore
  Error: "error", Warning: "warning", Info: "info", Verbose: "verbose", None: "none"
};

/**
 * Runs the {@link https://api-extractor.com/ | ApiExtractor}.
 * @param projectPackageJsonPath - path to the package.json file
 * @param options - the {@link https://api.rushstack.io/pages/api-extractor.iextractorconfigprepareoptions/ | IExtractorConfigPrepareOptions} of the APIExtractor.
 * @public
 */
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
  const extractorResult = Extractor.invoke(extractorConfig, {});
  if (extractorResult.succeeded) return console.log('API Extractor completed successfully');
  if (extractorResult.errorCount == 0) return console.warn('API Extractor completed with warnings');
  console.error('API Extractor completed with errors');
  throw new Error('API Extractor completed with errors');
}

