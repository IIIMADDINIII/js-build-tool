
import type { MakeOptions } from "@electron-forge/core";
import { setDisplayName } from "../tools/misc.js";
import * as tools from "./tools.js";


export function forgeMake(opts?: MakeOptions): () => Promise<void> {
  return setDisplayName("forgeMake", async function forgeMake() {
    await tools.forgeMake(opts);
  });
}

export function start() {
  return setDisplayName("start", async function start() {
    await tools.start();
  });
}
