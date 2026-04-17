import chalk from 'chalk';
import { EXIT_AUTH, EXIT_INPUT, EXIT_NOT_FOUND, EXIT_OK, EXIT_UPGRADE_REQUIRED } from './errors.js';
import { CLI_VERSION, SCHEMA_VERSION } from './version.js';

export type OutputFormat = 'human' | 'json';

let _format: OutputFormat = 'human';

export function setFormat(fmt: OutputFormat): void {
  _format = fmt;
}

export function getFormat(): OutputFormat {
  return _format;
}

export function isJson(): boolean {
  return _format === 'json';
}

export interface JsonEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  error_code?: string;
  schema_version: string;
  cli_version: string;
}

const ERROR_CODES: Record<number, string> = {
  [EXIT_AUTH]: 'AUTH_REQUIRED',
  [EXIT_NOT_FOUND]: 'NOT_FOUND',
  [EXIT_INPUT]: 'INVALID_INPUT',
  [EXIT_UPGRADE_REQUIRED]: 'UPGRADE_REQUIRED',
};

export function success<T>(data: T, humanRenderer?: () => void): never {
  if (isJson()) {
    const envelope: JsonEnvelope<T> = {
      ok: true,
      data,
      error: null,
      schema_version: SCHEMA_VERSION,
      cli_version: CLI_VERSION,
    };
    process.stdout.write(`${JSON.stringify(envelope)}\n`);
  } else {
    humanRenderer?.();
  }
  process.exit(EXIT_OK);
}

export function fail(message: string, exitCode: number): never {
  if (isJson()) {
    const envelope: JsonEnvelope<null> = {
      ok: false,
      data: null,
      error: message,
      error_code: ERROR_CODES[exitCode] ?? 'UNKNOWN_ERROR',
      schema_version: SCHEMA_VERSION,
      cli_version: CLI_VERSION,
    };
    process.stdout.write(`${JSON.stringify(envelope)}\n`);
  }
  process.stderr.write(`${chalk.red(`Error: ${message}`)}\n`);
  process.exit(exitCode);
}

export function validateFormat(fmt: string): OutputFormat {
  if (fmt === 'json' || fmt === 'human') return fmt;
  // fail() is `never`, which satisfies the OutputFormat return type
  return fail(`Invalid --format "${fmt}". Must be "human" or "json".`, EXIT_INPUT);
}

export function printLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

export function printErr(text: string): void {
  process.stderr.write(`${text}\n`);
}

export interface TableColumn<T> {
  header: string;
  width: number;
  get: (row: T) => string;
}

export function renderTable<T>(rows: T[], columns: TableColumn<T>[]): void {
  const pad = (s: string, width: number) => s.slice(0, width).padEnd(width);

  const header = columns.map((c) => pad(c.header.toUpperCase(), c.width)).join('  ');
  const divider = columns.map((c) => '-'.repeat(c.width)).join('  ');

  printLine(header);
  printLine(divider);
  for (const row of rows) {
    printLine(columns.map((c) => pad(c.get(row), c.width)).join('  '));
  }
}

export function check(text: string): string {
  return `${chalk.green('✓')} ${text}`;
}

export function cross(text: string): string {
  return `${chalk.red('✗')} ${text}`;
}

// Used when the caller just wants to emit structured success without a human renderer.
// Identical to success() but avoids the "unused parameter" TS warning for callers
// that only care about the JSON path.
export function successNoHuman<T>(data: T): never {
  return success(data, undefined);
}
