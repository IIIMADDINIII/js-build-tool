
import { tools, tasks } from "@iiimaddiniii/js-build-tool";

async function createIndexDts() {
  const oldFileContent = await tools.read("../js-build-tool/dist/index.d.ts");
  const indexOfFirstImport = oldFileContent.indexOf("import ") - 1;
  const module = oldFileContent.substring(indexOfFirstImport);
  const newFileContent = `
declare module "consts:production" {
  let production: boolean;
  export default production;
}
declare module "consts:development" {
  let development: boolean;
  export default development;
}
declare module "consts:testing" {
  let testing: boolean;
  export default testing;
}

declare module "@iiimaddiniii/js-build-tool" {
${module}
}
  `;
  await tools.write("./index.d.ts", newFileContent);
}

export const build = tools.exitAfter(
  createIndexDts);