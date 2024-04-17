import { $ } from "execa";
import { copyFile } from "fs/promises";
import { resolve } from "path";

/**
 * Copy Gulp File and run gulp.
 * Add .bin Paths to the path env variable.
 * @param tempDir - Folder where to copy the gulp file to.
 * @returns 
 */
export async function runGulp(tempDir: string, args: string[]): Promise<number> {
  const gulpFilePath = resolve(tempDir, "gulpfile.mjs");
  const cwd = process.cwd();
  await copyFile(resolve(cwd, "gulpfile.mjs"), gulpFilePath);
  try {
    const result = await $({ reject: false, verbose: true, stdio: "inherit", cleanup: true, env: { GULP_FILE: gulpFilePath } })`gulp -f ${gulpFilePath} --cwd ${cwd} ${args}`;
    return result.exitCode;
  } catch (e) {
    if ((typeof e !== "object") || (e === null) || !("exitCode" in e) || (typeof e.exitCode !== "number")) return -1;
    return e.exitCode;
  }
}