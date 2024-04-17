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