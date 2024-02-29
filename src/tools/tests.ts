import { exec } from "./exec.js";

/**
 * Run the testfiles with jest.
 * @param testFiles - files wich should be executed as tests.
 * @public
 */
export async function runTestFiles(testFiles: string[]) {
  const files = testFiles.map((testFile) => testFile.replaceAll("\\", "/"));
  await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest ${files}`;
}

/**
 * Runs all testfiles from the jest config.
 * @public
 */
export async function runTests() {
  await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest`;
}