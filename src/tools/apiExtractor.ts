import { Extractor, ExtractorConfig, IConfigFile } from "@microsoft/api-extractor";

export function runApiExtrator(projectPackageJsonPath: string, configObject: IConfigFile): void {
  const extractorConfig = ExtractorConfig.prepare({ configObject, configObjectFullPath: projectPackageJsonPath, packageJsonFullPath: projectPackageJsonPath });
  const extractorResult = Extractor.invoke(extractorConfig, {});
  if (!extractorResult.succeeded) {
    throw new Error(`API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`);
  }
  console.log(`API Extractor completed successfully`);
}