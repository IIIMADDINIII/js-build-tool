// Reference Switches so that the const:production and const:development packages are defined
/// <reference types="rollup-config-iiimaddiniii/switches" />


import * as path from "path";
import * as url from 'url';
//const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let cwd = process.cwd();
let packageDir = path.resolve(__dirname, "..");



console.log(cwd, packageDir, process.argv);