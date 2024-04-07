import { execNode } from "./exec.js";

/**
 * Run the testfiles with jest.
 * @param testFiles - files wich should be executed as tests.
 * @public
 */
export async function runTestFiles(testFiles: string[]) {
  const files = testFiles.map((testFile) => testFile.replaceAll("\\", "/"));
  await execNode("jest", files, { nodeOptions: ["--experimental-vm-modules", "--expose-gc"] });
}

/**
 * Runs all testfiles from the jest config.
 * @public
 */
export async function runTests() {
  await execNode("jest", [], { nodeOptions: ["--experimental-vm-modules", "--expose-gc"] });
}