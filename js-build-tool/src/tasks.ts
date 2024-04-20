
import { type IConfigFile } from "@microsoft/api-extractor";
import * as tools from "./tools.js";
import { series, type TaskFunction } from "./tools/gulp.js";
import { setDisplayName } from "./tools/misc.js";

import * as electron from "./electron/tasks.js";
import * as rollup from "./rollup/tasks.js";
import type { CountVersionOption, CreateCommitOptions, LitLocalizeConfig } from "./tools.js";
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
  return setDisplayName("prodInstallDependencies", series(setProd(), installDependencies()));
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
    tools.exit();
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

/**
 * Waits for the specified amount of milliseconds and then continues with the following tasks.
 * Can directly be used as an Rollup Task.
 * @param time - time in milliseconds to wait (default = 0).
 * @public
 */
export function wait(time: number = 0): TaskFunction {
  return setDisplayName("wait", async function wait() {
    await tools.wait(time);
  });
}

/**
 * Installs all dependencies of the package using pnpm.
 * Will use the frozen lockfile in Production mode.
 * Can directly be used as an Rollup Task.
 * @param majorMinorPatch - how to increment the version string (same as [pnpm version ***](https://docs.npmjs.com/cli/v8/commands/npm-version)) (default = "patch").
 * @returns A Gulp Task.
 * @public
 */
export function incrementVersion(semverInc: CountVersionOption = "patch"): TaskFunction {
  return setDisplayName("incrementVersion", async function incrementVersion() {
    await tools.incrementVersion(semverInc);
  });
}

/**
 * Publishes the Package using pnpm publish command.
 * Can directly be used as an Rollup Task.
 * @returns A Gulp Task.
 * @public
 */
export function publishPackage(): TaskFunction {
  return setDisplayName("publishPackage", async function publishPackage() {
    await tools.publishPackage();
  });
}

/**
 * Update all the dependencies with pnpm update.
 * Can directly be used as an Rollup Task.
 * @returns A Gulp Task.
 * @public
 */
export function updatePackages(): TaskFunction {
  return setDisplayName("updatePackages", async function updatePackages() {
    await tools.updatePackages();
  });
}

/**
 * Creates a commit using git commit command.
 * Can directly be used as an Rollup Task.
 * @param options - how to create the commit.
 * @returns A Gulp Task.
 * @public
 */
export function createCommit(options: CreateCommitOptions): TaskFunction {
  return setDisplayName("createCommit", async function createCommit() {
    await tools.createCommit(options);
  });
}

/**
 * Extract the Translation Messages using @lit/localize-tools extract command.
 * Only Runtime Mode is Supported.
 * Can directly be used as an Rollup Task.
 * @param config - The config for @lit/localize-tools.
 * @returns A Gulp Task.
 * @public
 */
export function litLocalizeExtract(config?: LitLocalizeConfig): TaskFunction {
  return setDisplayName("litLocalizeExtract", async function litLocalizeExtract() {
    await tools.litLocalizeExtract(config);
  });
}

/**
 * Generate the Translation files using @lit/localize-tools build command.
 * Only Runtime Mode is Supported.
 * Can directly be used as an Rollup Task.
 * @param config - The config for @lit/localize-tools.
 * @returns A Gulp Task.
 * @public
 */
export function litLocalizeBuild(config?: LitLocalizeConfig): TaskFunction {
  return setDisplayName("litLocalizeBuild", async function litLocalizeBuild() {
    await tools.litLocalizeBuild(config);
  });
}

/**
* Calls litLocalizeBuild, transformTranslationFilesToUseDependencyInjection and writePackageJsonExports.
 * Also overrides the baseDir default to "..".
 * Will generate a folder dist with a file for every translation, when called from a sub package named localize with default values.
 * Also Converts the generated output from litLocalizeBuild to use dependency injection (a function named templates is exported wich needs to be called with a str and html templateTag implementation as augments).
 * Can directly be used as an Rollup Task.
 * @param config - configuration of the litLocalizeBuild.
 * @returns A Gulp Task.
 * @public
 */
export function buildTranslationPackage(config?: LitLocalizeConfig): TaskFunction {
  return setDisplayName("buildTranslationPackage", async function buildTranslationPackage() {
    await tools.buildTranslationPackage(config);
  });
}

/**
 * Runs a Gulp Script in a temporary folder.
 * Can directly be used as an Rollup Task. 
 * @param gulpScript - the script to run. Can be a folder, then "gulpfile.mjs" is used as the file.
 * @param tasks - args to send to the gulp process (default = []).
 * @param label - prefix for the cli output (default = gulpScript + arg[0]).
 * @param dependencies - object, listing additional dependencies wich to install.
 * @param ignoreTaskMissing - ignores if the Task is missing (default = false).
 * @returns A Gulp Task.
 * @public
 */
export function runGulpScript(gulpScript: string, args: string[] = [], label?: string | undefined, dependencies?: { [key: string]: string; } | undefined, ignoreTaskMissing: boolean = false): TaskFunction {
  return setDisplayName("runGulpScript", async function runGulpScript() {
    await tools.runGulpScript(gulpScript, args, label, dependencies, ignoreTaskMissing);
  });
}

/**
 * Executes scripts in local packages matching the glob pattern.
 * Can directly be used as an Rollup Task. 
 * @param globPattern - object with glob patterns as keys and the args for the matching scripts as values.
 * @param respectLocalDependencies - only start functions for Packages, when dependencies finished (default = true).
 * @param ignoreCurrentGulpFile - do not execute in the current package (default = true).
 * @param ignoreTaskMissing - ignores if the Task is missing (default = true).
 * @returns A Gulp Task.
 * @public
 */
export function runScriptsInPackages(globPattern: tools.PackagesScripts, respectLocalDependencies: boolean = true, ignoreCurrentGulpFile: boolean = true, ignoreTaskMissing: boolean = true): TaskFunction {
  return setDisplayName("runScriptsInPackages", async function runScriptsInPackages() {
    await tools.runScriptsInPackages(globPattern, respectLocalDependencies, ignoreCurrentGulpFile, ignoreTaskMissing);
  });
}