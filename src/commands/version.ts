import type { Command } from 'commander';
import { printLine, success } from '../lib/output.js';
import { CLI_VERSION, SCHEMA_VERSION } from '../lib/version.js';

export function registerVersion(program: Command): void {
  program
    .command('version')
    .description('Show CLI and schema version information.')
    .action(() => versionAction());
}

export function versionAction(): never {
  return success(
    { version: CLI_VERSION, schema_version: SCHEMA_VERSION, min_supported: CLI_VERSION },
    () => {
      printLine(`philips-hue ${CLI_VERSION} (schema ${SCHEMA_VERSION})`);
    },
  );
}
