
import type { TaskFunction } from "../tools/gulp.js";
import { setDisplayName } from "../tools/misc.js";
import * as tools from "./tools.js";


// export function forgeMake(opts?: MakeOptions): () => Promise<void> {
//   return setDisplayName("forgeMake", async function forgeMake() {
//     await tools.forgeMake(opts);
//   });
// }


/**
 * Starts the electron app in the current folder (executes "pnpx electron .").
 * Can be directly used as an Gulp Task.
 * @returns A Gulp Task
 * @public
 */
export function start(): TaskFunction {
  return setDisplayName("start", async function start() {
    await tools.start();
  });
}

/**
 * Downloads the wixtoolset automatically and adds it to the path, so Electron Forge can use it.
 * Can be directly used as an Gulp Task.
 * @param releaseTag - wich release of the wixtoolset should be downloaded (undefined = latest).
 * @returns A Gulp Task
 * @public
 */
export function prepareWixTools(releaseTag?: string): TaskFunction {
  return setDisplayName("prepareWixTools", async function prepareWixTools() {
    await tools.prepareWixTools(releaseTag);
  });
}