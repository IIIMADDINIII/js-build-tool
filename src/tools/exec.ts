import { $, execaNode } from "execa";

/**
 * Utility for executing Processes.
 * It is a tag function for a template string.
 * @param options - An  {@link https://github.com/sindresorhus/execa | EXECA object} specifying options on how to start the process.
 * @example
 * 
 * ```
 * await exec`corepack prepare pnpm@${version} --activate`;
 * await exec({ env: { GIT_ASK_YESNO: "false" } })`git -c core.longpaths=true clean -dfX`;
 * await exec({ env: { NODE_OPTIONS: "--experimental-vm-modules" } })`jest ${testFiles.map((testFile) => testFile.replaceAll("\\", "/"))}`;
 * ```
 * @public
 */
export const exec: typeof $ = $({ verbose: true, stdio: "inherit", cleanup: true });

/**
 * Utility for executing nodejs scripts.
 * @public
 */
export const execNode: typeof execaNode = ((scriptPath, args, options) => {
  const opts = options || args;
  const arg = opts === args ? [] : args;
  return execaNode(scriptPath, arg, { verbose: true, stdio: "inherit", cleanup: true });
}) as typeof execaNode;