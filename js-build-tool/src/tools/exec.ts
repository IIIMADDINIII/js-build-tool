import { $, execaNode, type ExecaChildProcess, } from "execa";
import { EOL } from "os";
import { createInterface } from "readline";
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
export const exec = $({ verbose: true, stdio: "inherit", cleanup: true });

/**
 * Utility for executing nodejs scripts.
 * @public
 */
export const execNode = ((scriptPath: string, args: string[], options: {}) => {
  const opts = options || args;
  const arg = opts === args ? [] : args;
  return execaNode(scriptPath, arg, { verbose: true, stdio: "inherit", cleanup: true, ...opts });
}) as unknown as typeof execaNode;

/**
 * Prints the Output of the Execa Task to the console with a prefix.
 * @param task - the Task to print the Output.
 * @param prefix - prefix to Prepend.
 * @public
 */
export async function prefixTaskOutput(task: ExecaChildProcess, prefix: string) {
  const dim = (await chalk()).default.gray;
  if (task.stdout !== null) {
    const rl = createInterface({ input: task.stdout });
    rl.on("line", (line) => {
      process.stdout.write(dim(prefix) + line + EOL);
    });
  }
  if (task.stderr !== null) {
    const rl = createInterface({ input: task.stderr });
    rl.on("line", (line) => {
      process.stderr.write(dim(prefix) + line + EOL);
    });
  }
}

