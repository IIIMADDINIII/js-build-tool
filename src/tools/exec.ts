import { $ } from "execa";

export const exec = $({ verbose: true, stdio: 'inherit' });