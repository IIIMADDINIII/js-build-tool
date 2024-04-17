import { readdir, rm } from "fs/promises";
import { resolve } from "path";
import { lock } from "proper-lockfile";


/**
 * Finds an unused Temporary folder in the dependency dir
 * @param dependenciesDir - dependency dir to look for an unused folder.
 * @returns object containing the release function for the locked folder and the path of the folder.
 */
export async function getTempFolder(dependenciesDir: string): Promise<{ release: () => Promise<void>, tempDir: string; }> {
  let counter = 0;
  let finished = false;
  while (true) {
    counter += 1;
    const tempDir = resolve(dependenciesDir, "run" + counter);
    try {
      // Try to lock folder
      const release = await lock(tempDir, { realpath: false });
      try {
        // Try to remove folder when locked
        await rm(tempDir, { recursive: true, force: true });
        try {
          // Folder should no longer exist
          await readdir(tempDir);
          continue;
        } catch (e) {
          if ((typeof e !== "object") || (e === null) || !("code" in e) || (e.code !== "ENOENT")) throw e;
          finished = true;
          return { release: async () => { await release(); await rm(tempDir, { recursive: true, force: true }); }, tempDir };
        }
      } finally {
        if (!finished) await release();
      }
    } catch (e) {
      if ((typeof e !== "object") || (e === null) || !("code" in e) || (e.code !== "ELOCKED")) throw e;
      continue;
    }
  }
}