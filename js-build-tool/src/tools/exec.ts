import { $, execaNode } from "execa";
import { chalk } from "../lateImports.js";

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
export const exec = $({ verbose: "short", stdio: "inherit", cleanup: true }) as unknown as typeof $;

/**
 * Utility for executing nodejs scripts.
 * @public
 */
export const execNode = ((scriptPath: string, args: string[], options: {}) => {
  const opts = options || args;
  const arg = opts === args ? [] : args;
  return execaNode(scriptPath, arg, { verbose: "short", stdio: "inherit", cleanup: true, ...opts });
}) as unknown as typeof execaNode;


export async function prefixIo(prefix: string): Promise<(line: unknown) => Generator<string, void, unknown>> {
  const dim = (await chalk()).default.gray;
  return function* (line: unknown) {
    if (typeof line !== "string") throw new Error("line is not a string");
    yield dim(prefix) + line;
  };
}


