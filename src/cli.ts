// Reference Switches so that the const:production and const:development packages are defined
/// <reference types="rollup-config-iiimaddiniii/switches" />


import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as url from 'url';
//const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let cwd = process.cwd();
let src = path.resolve(cwd, "gulpfile.mjs");
let dest = path.resolve(__dirname, "../../../../gulpfile.mjs");
let args = "\"" + process.argv.slice(2).join("\" \"") + "\"";
let command = `gulp -f "${dest}" --cwd "${cwd}" ${args}`;

fs.copyFileSync(src, dest);
cp.execSync(command, { stdio: "inherit" });
