import { exec } from "@iiimaddiniii/js-build-tool/execa";
import { series } from "@iiimaddiniii/js-build-tool/gulp";
import { rollup } from "@iiimaddiniii/js-build-tool/rollup";
import type { TaskFunction } from "gulp";
import * as path from "path";

let prod = false;
export const cwd = process.cwd();
export const packageDir = cwd;

export function file(relPath: string): string {
  return path.resolve(packageDir, relPath);
}

export function isProd(): boolean {
  return prod;
}

export async function setProd(): Promise<void> {
  prod = true;
}
setProd.displayName = "setProd";

export function selectPnpm(version: string = "latest"): () => Promise<void> {
  async function selectPnpm() {
    await exec(`corepack prepare pnpm@${version} --activate`);
  };
  selectPnpm.displayName = "selectPnpm";
  return selectPnpm;
}

export async function installDependencies(): Promise<void> {
  if (isProd()) {
    await exec("pnpm install --frozen-lockfile");
  } else {
    await exec("pnpm install");
  }
}
installDependencies.displayName = "installDependencies";

export function selectPnpmAndInstall(version: string = "latest"): TaskFunction {
  return series(selectPnpm(version), installDependencies);
}
selectPnpmAndInstall.displayName = "selectPnpmAndInstall";

export function prodSelectPnpmAndInstall(version: string = "latest"): TaskFunction {
  return series(setProd, selectPnpm(version), installDependencies);
}
prodSelectPnpmAndInstall.displayName = "prodSelectPnpmAndInstall";

export async function cleanWithGit(): Promise<void> {
  await exec("git clean -dfX");
}
cleanWithGit.displayName = "cleanWithGit";


async function rollupConfig(options: any): Promise<void> {
  let bundle: any;
  try {
    try {
      bundle = await rollup(options);
      let results = await Promise.allSettled(options.output.map(async (opts: any) => {
        try {
          await bundle.write(opts);
        } catch (error) {
          console.error(error);
          throw error;
        }
      }));
      for (let res of results) {
        if (res.status == "rejected") throw res.reason;
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  } finally {
    if (bundle) {
      await bundle.close();
    }
  }
}

export function runRollup(options: any): () => Promise<void> {
  async function runRollup(): Promise<void> {
    await Promise.allSettled<void>(options.map(rollupConfig));
  }
  runRollup.displayName = "runRollup";
  return runRollup;
}