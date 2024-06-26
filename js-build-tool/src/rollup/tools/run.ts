
import type { RollupOptions, SerializedTimings } from "rollup";
import { getLoadConfigFileJs, parseAst_js, rollupJs } from "../../lateImports.js";


const BYTE_UNITS = [
  'B',
  'kB',
  'MB',
  'GB',
  'TB',
  'PB',
  'EB',
  'ZB',
  'YB',
];

function parseMilliseconds(milliseconds: number) {
  const roundTowardsZero = milliseconds > 0 ? Math.floor : Math.ceil;
  return {
    days: roundTowardsZero(milliseconds / 86400000),
    hours: roundTowardsZero(milliseconds / 3600000) % 24,
    minutes: roundTowardsZero(milliseconds / 60000) % 60,
    seconds: roundTowardsZero(milliseconds / 1000) % 60,
    milliseconds: roundTowardsZero(milliseconds) % 1000,
    microseconds: roundTowardsZero(milliseconds * 1000) % 1000,
    nanoseconds: roundTowardsZero(milliseconds * 1e6) % 1000
  };
}

const SECOND_ROUNDING_EPSILON = 0.000_000_1;

function prettyMilliseconds(milliseconds: number) {
  const result: string[] = [];
  const floorDecimals = (value: number) => {
    const flooredInterimValue = Math.floor((value * (10 ** 1)) + SECOND_ROUNDING_EPSILON);
    const flooredValue = Math.round(flooredInterimValue) / (10 ** 1);
    return flooredValue.toFixed(1);
  };
  const add = (value: number, short: string, valueString?: string) => {
    if (value === 0) return;
    valueString = (valueString || value || '0').toString();
    result.push(valueString + short);
  };
  const parsed = parseMilliseconds(milliseconds);
  add(Math.trunc(parsed.days / 365), 'y');
  add(parsed.days % 365, 'd');
  add(parsed.hours, 'h');
  add(parsed.minutes, 'm');
  if (milliseconds < 1000) {
    add(parsed.seconds, 's');
    const millisecondsAndBelow = parsed.milliseconds + (parsed.microseconds / 1000) + (parsed.nanoseconds / 1e6);
    const roundedMiliseconds = millisecondsAndBelow >= 1 ? Math.round(millisecondsAndBelow) : Math.ceil(millisecondsAndBelow);
    const millisecondsString = roundedMiliseconds.toString();
    add(Number.parseFloat(millisecondsString), 'ms', millisecondsString);
  } else {
    const seconds = (milliseconds / 1000) % 60;
    const secondsFixed = floorDecimals(seconds);
    const secondsString = secondsFixed.replace(/\.0+$/, '');
    add(Number.parseFloat(secondsString), 's', secondsString);
  }
  if (result.length === 0) {
    return '0ms';
  }
  return result.join(' ');
}

function prettyBytes(number: number) {
  const UNITS = BYTE_UNITS;
  if (number < 1) return number.toString() + ' ' + UNITS[0];
  const exponent = Math.min(Math.floor(Math.log10(number) / 3), UNITS.length - 1);
  number /= (1000) ** exponent;
  const numberString = Number(number.toPrecision(3)).toString();
  const unit = UNITS[exponent];
  return numberString + ' ' + unit;
}

async function build(inputOptions: RollupOptions, warnings: Warnings, silent = false) {
  let outputOptions = inputOptions.output;
  if (outputOptions === undefined) outputOptions = [];
  if (!Array.isArray(outputOptions)) outputOptions = [outputOptions];
  const start = Date.now();
  const relativeId = (await parseAst_js()).relativeId;
  const files = outputOptions.map(t => relativeId(t.file || t.dir));
  if (!silent) {
    let inputFiles;
    if (typeof inputOptions.input === 'string') {
      inputFiles = inputOptions.input;
    }
    else if (Array.isArray(inputOptions.input)) {
      inputFiles = inputOptions.input.join(', ');
    }
    else if (typeof inputOptions.input === 'object' && inputOptions.input !== null) {
      inputFiles = Object.values(inputOptions.input).join(', ');
    }
    (await rollupJs()).stderr((await rollupJs()).cyan(`\n${(await rollupJs()).bold(inputFiles)} → ${(await rollupJs()).bold(files.join(', '))}...`));
  }
  const bundle = await (await rollupJs()).rollup(inputOptions);
  await Promise.all(outputOptions.map(bundle.write));
  await bundle.close();
  if (!silent) {
    warnings.flush();
    (await rollupJs()).stderr((await rollupJs()).green(`created ${(await rollupJs()).bold(files.join(', '))} in ${(await rollupJs()).bold(prettyMilliseconds(Date.now() - start))}`));
    if (bundle && bundle.getTimings) {
      await printTimings(bundle.getTimings());
    }
  }
}

async function printTimings(timings: SerializedTimings) {
  for (const [label, [time, memory, total]] of Object.entries(timings)) {
    let appliedColor = (text: string) => text;
    if (label[0] === '#') {
      if (label[1] === '#') {
        appliedColor = (await rollupJs()).bold;
      } else {
        appliedColor = (await rollupJs()).underline;
      }
    }
    const row = `${label}: ${time.toFixed(0)}ms, ${prettyBytes(memory)} / ${prettyBytes(total)}`;
    console.info(appliedColor(row));
  }
}

/**
 * Options wich are normally provided to rollup with cli flags.
 * @public
 */
export interface CommandOptions {
  /**
   * The build should fail if warnings are emitted.
   * @default true
   */
  failAfterWarnings?: boolean;
  /**
   * The build should be silent.
   * @default false
   */
  silent?: boolean;
}

interface Warnings {
  flush(): void;
}

async function getConfigList(config: RollupOptions[] | RollupOptions): Promise<RollupOptions[]> {
  if (Object.keys(config).length === 0) {
    return (await rollupJs()).error((await rollupJs()).errorMissingConfig());
  }
  return Array.isArray(config) ? config : [config];
}

async function loadConfigFile(rollupOptions: RollupOptions[] | RollupOptions, commandOptions: CommandOptions) {
  const configs = await getConfigList(rollupOptions);
  const warnings = (await getLoadConfigFileJs()).batchWarnings(commandOptions.silent);
  try {
    const normalizedConfigs = [];
    for (const config of configs) {
      const options = await (await rollupJs()).mergeOptions(config, { external: [], globals: undefined }, warnings.add);
      normalizedConfigs.push(options);
    }
    return { options: normalizedConfigs, warnings };
  }
  catch (error_) {
    warnings.flush();
    throw error_;
  }
};

/**
 * Run Rollup with an custom configuration.
 * @param rollupOptions - Rollup Options wich normally are defined by the rollup.config.js.
 * @param commandOptions - Options wich are normally provided through cli flags.
 * @public
 */
export async function run(rollupOptions?: RollupOptions[] | RollupOptions, commandOptions?: CommandOptions): Promise<void> {
  if (rollupOptions === undefined) throw new Error("Rollup config is Empty");
  const command: Required<CommandOptions> = { failAfterWarnings: true, silent: false, ...commandOptions };
  try {
    let { options, warnings } = await loadConfigFile(rollupOptions, command);
    try {
      for (const inputOptions of options) {
        await build(inputOptions, warnings, command.silent);
      }
      if (command.failAfterWarnings && warnings.warningOccurred) {
        warnings.flush();
        (await rollupJs()).handleError((await rollupJs()).errorFailAfterWarnings(), true);
      }
    } catch (error) {
      warnings.flush();
      (await rollupJs()).handleError(error, true);
      throw error;
    }
  } catch (error) {
    (await rollupJs()).handleError(error, true);
    throw error;
  }
}