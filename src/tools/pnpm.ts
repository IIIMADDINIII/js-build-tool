

import { exec } from "gulp-execa";
import { isProd } from "./misc.js";

export async function selectPnpm(version: string = "latest"): Promise<void> {
  await exec(`corepack prepare pnpm@${version} --activate`);
}

export async function installDependencies(): Promise<void> {
  if (isProd()) {
    await exec("pnpm install --frozen-lockfile");
  } else {
    await exec("pnpm install");
  }
}

export async function runScript(script: string, args: string[] = []) {
  let arg = args.length > 0 ? "\"" + args.join("\" \"") + "\"" : "";
  await exec("pnpm run " + script + " " + arg);
}

export async function runWorkspaceScript(script: string, filter: string = "*", args: string[] = []) {
  let arg = args.length > 0 ? "\"" + args.join("\" \"") + "\"" : "";
  await exec("pnpm run --filter=" + filter + " --reporter=append-only --aggregate-output " + script + " " + arg);
}

export async function runWorkspaceScriptParallel(script: string, filter: string = "*", args: string[] = []) {
  let arg = args.length > 0 ? "\"" + args.join("\" \"") + "\"" : "";
  await exec("pnpm run --filter=" + filter + " --parallel --reporter=append-only --aggregate-output " + script + " " + arg);
}