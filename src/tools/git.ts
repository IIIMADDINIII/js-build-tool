import { exec } from "./exec.js";

/**
 * Clean the Project folder with git (git -c core.longpaths=true clean -dfX).
 * @public
 */
export async function cleanWithGit(): Promise<void> {
  await exec({ env: { GIT_ASK_YESNO: "false" } })`git -c core.longpaths=true clean -dfX`;
}