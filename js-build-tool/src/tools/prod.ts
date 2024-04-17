
let prod = false;

/**
 * Returns if it was run in production mode.
 * @returns true when it is in production mode.
 * @public
 */
export function isProd(): boolean {
  let prodEnv = process.env["prod"];
  if (prodEnv === undefined) return prod;
  return prod || (prodEnv.trim().toLowerCase() == "true");
}

/**
 * Sets the environment to be Production.
 * All Tasks from now run in Production mode.
 * @public
 */
export function setProd(): void {
  process.env["prod"] = "true";
  prod = true;
}