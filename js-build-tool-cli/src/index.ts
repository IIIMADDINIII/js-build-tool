import { ensureDependencies } from "./ensureDependencies.js";
import { getTempFolder } from "./getTempFolder.js";
import { installCustomDependencies } from "./installCustomDependencies.js";
import { addBinToPath } from "./pnpmInstall.js";
import { runGulp } from "./runGulp.js";

/**
 * Main function to execute.
 * @returns Exitcode.
 */
async function main(): Promise<number> {
  const dependenciesDir = await ensureDependencies();
  addBinToPath(dependenciesDir);
  const { tempDir, release } = await getTempFolder(dependenciesDir);
  try {
    const args = await installCustomDependencies(tempDir);
    const exitCode = await runGulp(tempDir, args);
    return exitCode;
  } finally {
    await release();
  }
}

// Run Main Function
main()
  .then(process.exit)
  .catch((e) => {
    console.error(e);
    process.exit(-1);
  });