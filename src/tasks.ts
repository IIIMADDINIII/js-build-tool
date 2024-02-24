
import type { IConfigFile } from "@microsoft/api-extractor";
import * as tools from "./tools.js";
import { series, type TaskFunction } from "./tools/gulp.js";
import { setDisplayName } from "./tools/misc.js";

import * as electron from "./electron/tasks.js";
import * as rollup from "./rollup/tasks.js";
export { electron, rollup };

/**
 * Sets the environment to be Production.
 * All Tasks from now run in Production mode.
 * Can directly be used as an Rollup Task.
 * @returns A Gulp Task.
 * @public
 */
export function setProd(): TaskFunction {
  return setDisplayName("setProd", async function setProd() {
    tools.setProd();
  });
}

/**
 * Installs all dependencies of the package using pnpm.
 * Will use the frozen lockfile in Production mode.
 * Can directly be used as an Rollup Task.
 * @returns A Gulp Task.
 * @public
 */
export function installDependencies(): TaskFunction {
  return setDisplayName("installDependencies", async function installDependencies() {
    await tools.installDependencies();
  });
}


/**
 * A combination of {@link setProd}, {@link selectPnpm} and {@link installDependencies}.
 * Set Production mode and after installing pnpm installing all dependencies.
 * Pnpm version specified by range in package.json engines.pnpm.
 * Can directly be used as an Rollup Task.
 * @returns A Gulp Task.
 * @public
 */
export function prodInstallDependencies(): TaskFunction {
  return setDisplayName("selectPnpmAndInstall", series(setProd(), installDependencies()));
}

/**
 * Clean the Project folder with git (git -c core.longpaths=true clean -dfX).
 * Can directly be used as an Rollup Task.
 * @returns A Gulp Task.
 * @public
 */
export function cleanWithGit(): TaskFunction {
  return setDisplayName("cleanWithGit", async function cleanWithGit() {
    await tools.cleanWithGit();
  });
}

/**
 * Runs a pnpm script defined in the package.json file.
 * Can directly be used as an Rollup Task.
 * @param script - the name of the script to run.
 * @param args - an Array of arguments for the script (default = []).
 * @returns A Gulp Task.
 * @public
 */
export function runScript(script: string, args: string[] = []): TaskFunction {
  return setDisplayName("runScript", async function runScript() {
    tools.runScript(script, args);
  });
}

/**
 * Runs a script in one specific or all workspaces.
 * Can directly be used as an Rollup Task.
 * @param script - the name of the script to run.
 * @param filter - a pnpm filter to specify in which workspaces to run the script (default = "*").
 * @param args - an Array of arguments for the script (default = []).
 * @returns A Gulp Task.
 * @public
 */
export function runWorkspaceScript(script: string, filter: string = "*", args: string[] = []): TaskFunction {
  return setDisplayName("runWorkspaceScript", async function runWorkspaceScript() {
    await tools.runWorkspaceScript(script, filter, args);
  });
}

/**
 * Runs a script in one specific or all workspaces in parallel.
 * Can directly be used as an Rollup Task.
 * @param script - the name of the script to run.
 * @param filter - a pnpm filter to specify in which workspaces to run the script (default = "*").
 * @param args - an Array of arguments for the script (default = []).
 * @returns A Gulp Task.
 * @public
 */
export function runWorkspaceScriptParallel(script: string, filter: string = "*", args: string[] = []): TaskFunction {
  return setDisplayName("runWorkspaceScriptParallel", async function runWorkspaceScriptParallel() {
    await tools.runWorkspaceScriptParallel(script, filter, args);
  });
}

/**
 * Exit the current process.
 * Can directly be used as an Rollup Task.
 * @returns A Gulp Task.
 * @public
 */
export function exit(): TaskFunction {
  return setDisplayName("exit", async function exit() {
    setTimeout(() => {
      process.exit();
    }, 50);
  });
}

/**
 * Run the testfiles with jest.
 * Can directly be used as an Rollup Task.
 * @param testFiles - files wich should be executed as tests.
 * @returns A Gulp Task.
 * @public
 */
export function runTestFiles(testFiles: string[]): TaskFunction {
  return setDisplayName("runTestFiles", async function runTestFiles() {
    await tools.runTestFiles(testFiles);
  });
}

/**
 * Runs all testfiles from the jest config.
 * Can directly be used as an Rollup Task.
 * @returns A Gulp Task.
 * @public
 */
export function runTests(): TaskFunction {
  return setDisplayName("runTests", async function runTests() {
    await tools.runTests();
  });
}

/**
 * Runs the {@link https://api-extractor.com/ | ApiExtractor}.
 * Can directly be used as an Rollup Task.
 * @param projectPackageJsonPath - path to the package.json file
 * @param configObject - the {@link https://api.rushstack.io/pages/api-extractor.iextractorconfigprepareoptions/ | IExtractorConfigPrepareOptions} of the APIExtractor.
 * @returns A Gulp Task.
 * @public
 */
export function runApiExtrator(projectPackageJsonPath: string, configObject: IConfigFile): TaskFunction {
  return setDisplayName("runApiExtrator", async function runApiExtrator() {
    await tools.runApiExtrator(projectPackageJsonPath, configObject);
  });
}