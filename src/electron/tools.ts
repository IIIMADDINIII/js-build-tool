import { MakeOptions, api } from "@electron-forge/core";
import { exec } from "gulp-execa";


export async function forgeMake(opts?: MakeOptions) {
  await api.make(opts ? opts : {});
}

export async function start() {
  await exec("pnpx electron .");
}