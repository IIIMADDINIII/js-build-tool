const mod = require("module");
const fs = require("fs");
const path = require("path");
const origJsExtension = mod.Module._extensions['.js'];
const moduleParentCache = new WeakMap();
const oldModule = mod.Module;
mod.Module = function Module(id, parent) {
  const ret = oldModule.call(this, id, parent);
  moduleParentCache.set(this, parent);
  return ret;
}
Object.assign(mod.Module, oldModule);
class ERR_REQUIRE_ESM extends Error {
  code = "ERR_REQUIRE_ESM";
  constructor(filename, hasEsmSyntax, parentPath, packageJsonPath) {
    super();
    const msg = (() => {
      let msg = `require() of ES Module ${filename}${parentPath ? ` from ${parentPath}` : ''} not supported.`;
      if (!packageJsonPath) {
        if (filename.endsWith('.mjs')) msg += `\nInstead change the require of ${filename} to a dynamic import() which is available in all CommonJS modules.`;
        return msg;
      }
      const basename = parentPath && path.basename(filename) === path.basename(parentPath) ? filename : path.basename(filename);
      msg += `\n${basename} is treated as an ES module file as it is a .js ` +
        'file whose nearest parent package.json contains "type": "module" ' +
        'which declares all .js files in that package scope as ES modules.' +
        `\nInstead either rename ${basename} to end in .cjs, change the requiring ` +
        'code to use dynamic import() which is available in all CommonJS ' +
        'modules, or change "type": "module" to "type": "commonjs" in ' +
        `${packageJsonPath} to treat all .js files as CommonJS (using .mjs for ` +
        'all ES modules instead).\n';
        return msg;
    })();
    ObjectDefineProperty(this, 'message', {
      __proto__: null,
      value: msg,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  get ['constructor']() {
    return Base;
  }

  get [Symbol('kIsNodeError')]() {
    return true;
  }
  toString() {
    return `${this.name} [${key}]: ${this.message}`;
  }
}
mod.Module._extensions['.js'] = function(module, filename) {
  if (!filename.includes(".asar/") && !filename.includes(".asar\\")) {
    return origJsExtension(module, filename);
  }
  let content = fs.readFileSync(filename, 'utf8');
  if (filename.endsWith('.js')) {
    const pkg = readPackageScope(filename) || { __proto__: null };
    // Function require shouldn't be used in ES modules.
    if (pkg.data?.type === 'module') {
      // This is an error path because `require` of a `.js` file in a `"type": "module"` scope is not allowed.
      const parent = moduleParentCache.get(module);
      const parentPath = parent?.filename;
      const packageJsonPath = path.resolve(pkg.path, 'package.json');
      const err = new ERR_REQUIRE_ESM(filename, false, parentPath,
                                      packageJsonPath);
      // Attempt to reconstruct the parent require frame.
      if (Module._cache[parentPath]) {
        let parentSource;
        try {
          parentSource = fs.readFileSync(parentPath, 'utf8');
        } catch {
          // Continue regardless of error.
        }
        if (parentSource) {
          const errLine = err.stack.slice(err.stack.indexOf('    at ')).split('\n', 1)[0];
          const { 1: line, 2: col } = /(\d+):(\d+)\)/.exec(errLine) || [];
          if (line && col) {
            const srcLine = parentSource.split('\n')[line - 1];
            const frame = `${parentPath}:${line}\n${srcLine}\n${' '.repeat(col - 1)}^\n`;
            setArrowMessage(err, frame);
          }
        }
      }
      throw err;
    }
  }
  module._compile(content, filename);
};
function readPackageScope(filename) {
  let packagePath = path.resolve(filename, "..");
  let packageContent = false;
  while (true) {
    packageContent = tryReadPackageFile(packagePath);
    if (packageContent !== false) break;
    packagePath = path.resolve(packagePath, "..");
  }
  return {
    data: JSON.parse(packageContent),
    path: packagePath,
  };
}
function tryReadPackageFile(paths) {
  try {
    return fs.readFileSync(path.resolve(paths, "package.json"));
  } catch (e) {
    if (typeof e === "object" && e !== null && e.code === "ENOENT") {
      return false;
    }
    throw e;
  }
}
const arrow_message_private_symbol = Symbol("node:arrowMessage");
function setArrowMessage(err, arrowMessage) {
  err[arrow_message_private_symbol] = arrowMessage;
}