module globalThis {
  export let navigator: unknown = undefined;
}

globalThis.navigator = undefined;

import * as gulp from "gulp";
import * as execa from "gulp-execa";

export { gulp, execa };

