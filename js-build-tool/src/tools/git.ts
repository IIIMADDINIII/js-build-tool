import { exec } from "./exec.js";

/**
 * Clean the Project folder with git (git -c core.longpaths=true clean -dfX).
 * @public
 */
export async function cleanWithGit(): Promise<void> {
  await exec({ env: { GIT_ASK_YESNO: "false" } })`git -c core.longpaths=true clean -dfX`;
}

/**
 * Options on how to create a git Commit.
 * @public
 */
export interface CreateCommitOptions {
  /**
   * Tell the command to automatically stage files that have been modified and deleted, but new files you have not told Git about are not affected.
   * @default true
   */
  all?: boolean;
  /**
   * Use the given message as the commit message.
   */
  message: string;
}

/**
 * Creates a commit using git commit command.
 * @param options - how to create the commit.
 * @public
 */
export async function createCommit(options: CreateCommitOptions) {
  await exec`git commit ${options.all === false ? "" : "--all"} --message ${options.message}`;
}

/**
 * Returns true if the Git Working Directory is Clean.
 * @returns true if git working directory is clean
 * @public
 */
export async function isGitClean(): Promise<boolean> {
  const stdout = (await exec({ stdio: "pipe" })`git status --porcelain=v1 -uno`).stdout;
  for (const line of stdout.trim().split(/\r?\n+/)) {
    if (line.trim() !== "") {
      return false;
    }
  }
  return true;
}

/**
 * Throes an error if the Git Working Directory is not clean.
 * @public
 */
export async function ensureGitIsClean(): Promise<void> {
  if (await isGitClean()) return;
  throw new Error("Git Working Directory is not clean");
}