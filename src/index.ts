import { Command } from 'commander';
import { registerAuth } from './commands/auth.js';
import { registerDevices } from './commands/devices.js';
import { registerSkills } from './commands/skills.js';
import { registerVersion } from './commands/version.js';
import { setFormat, validateFormat } from './lib/output.js';
import { checkVersion } from './lib/update.js';
import { CLI_VERSION } from './lib/version.js';

const program = new Command();

program
  .name('philips-hue')
  .description('Agent-native CLI for controlling Philips Hue smart lights (mocked backend).')
  .version(CLI_VERSION)
  .option('--format <format>', 'output format: human or json', 'human');

program.hook('preAction', async (thisCommand) => {
  const fmt = thisCommand.optsWithGlobals().format as string;
  setFormat(validateFormat(fmt));
  await checkVersion();
});

registerAuth(program);
registerDevices(program);
registerSkills(program);
registerVersion(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`philips-hue: ${message}\n`);
  process.exit(1);
});
