

import { $ } from "execa";
import { isProd } from "./misc.js";

export async function selectPnpm(version: string = "latest"): Promise<void> {
  await $`corepack prepare pnpm@${version} --activate`;
}

export async function installDependencies(): Promise<void> {
  if (isProd()) {
    await $`pnpm install --frozen-lockfile --config.confirmModulesPurge=false`;
  } else {
    await $`pnpm install --config.confirmModulesPurge=false`;
  }
}

export async function runScript(script: string, args: string[] = []) {
  await $`pnpm run ${script} ${args}`;
}

export async function runWorkspaceScript(script: string, filter: string = "*", args: string[] = []) {
  await $`pnpm run --filter=${filter} --reporter=append-only --aggregate-output ${script} ${args}`;
}

export async function runWorkspaceScriptParallel(script: string, filter: string = "*", args: string[] = []) {
  await $`pnpm run --filter=${filter} --parallel --reporter=append-only --aggregate-output ${script} ${args}`;
}