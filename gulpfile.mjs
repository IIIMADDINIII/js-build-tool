//import { gulp, execa } from "@iiimaddiniii/js-build-tool";
import { gulp } from "@iiimaddiniii/js-build-tool/gulp";
import { execa } from "@iiimaddiniii/js-build-tool/execa";
import * as fs from "fs/promises";

let prod = false;

export async function clean() {
  await execa.exec("git clean -dfX");
}

export async function bundle() {
  let env = {};
  if (prod) {
    env.prod = "true";
  }
  await execa.exec("pnpm exec rollup --config node:iiimaddiniii", { env });
}

export async function build() {
  return await bundle();
}

export async function buildCi() {
  prod = true;
  await clean();
  await bundle();
}
