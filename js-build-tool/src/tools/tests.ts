import path from "path";
import { execNode } from "./exec.js";
import { projectNodeModulesPath } from "./paths.js";

function getJestJs(): string {
  return path.resolve(projectNodeModulesPath, "jest", "bin", "jest.js");
}

/**
 * Run the testfiles with jest.
 * @param testFiles - files wich should be executed as tests.
 * @public
 */
export async function runTestFiles(testFiles: string[]) {
  const files = testFiles.map((testFile) => testFile.replaceAll("\\", "/"));
  await execNode(getJestJs(), files, { nodeOptions: ["--experimental-vm-modules", "--expose-gc"] });
}

/**
 * Runs all testfiles from the jest config.
 * @public
 */
export async function runTests() {
  await execNode(getJestJs(), [], { nodeOptions: ["--experimental-vm-modules", "--expose-gc"] });
}