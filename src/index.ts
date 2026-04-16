import { Command } from 'commander';
import { registerAuth } from './commands/auth.js';
import { registerDevices } from './commands/devices.js';
import { registerSkills } from './commands/skills.js';
import type { OutputFormat } from './lib/output.js';
import { setFormat } from './lib/output.js';

const program = new Command();

program
  .name('philips-hue')
  .description('Agent-native CLI for controlling Philips Hue smart lights (mocked backend).')
  .version('0.1.0')
  .option('--format <format>', 'output format: human or json', 'human');

program.hook('preAction', (thisCommand) => {
  const fmt = thisCommand.optsWithGlobals().format as string;
  if (fmt === 'json' || fmt === 'human') {
    setFormat(fmt as OutputFormat);
  }
});

registerAuth(program);
registerDevices(program);
registerSkills(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`philips-hue: ${message}\n`);
  process.exit(1);
});
