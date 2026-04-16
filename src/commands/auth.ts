import type { Command } from 'commander';
import {
  deleteCredentials,
  generateToken,
  loadCredentials,
  writeCredentials,
} from '../lib/auth.js';
import { EXIT_AUTH } from '../lib/errors.js';
import { check, fail, success } from '../lib/output.js';

export function registerAuth(program: Command): void {
  const auth = program.command('auth').description('Manage bridge authentication.');

  auth
    .command('login')
    .description('Simulate OAuth and authenticate with the Hue bridge.')
    .action(() => loginAction());

  auth
    .command('status')
    .description('Show current authentication state.')
    .action(() => statusAction());

  auth
    .command('logout')
    .description('Remove stored credentials.')
    .action(() => logoutAction());
}

export function loginAction(): never {
  const creds = {
    access_token: generateToken(),
    authenticated: true as const,
    user: 'demo@philipshue.com',
  };
  writeCredentials(creds);
  return success(creds, () => {
    process.stdout.write(`${check(`Authenticated as ${creds.user}`)}\n`);
  });
}

export function statusAction(): never {
  const creds = loadCredentials();
  if (!creds?.authenticated) {
    return fail('Not authenticated. Run: philips-hue auth login', EXIT_AUTH);
  }
  return success({ authenticated: true, user: creds.user }, () => {
    process.stdout.write(`${check(`Authenticated as ${creds.user}`)}\n`);
  });
}

export function logoutAction(): never {
  deleteCredentials();
  return success({ authenticated: false }, () => {
    process.stdout.write('Logged out.\n');
  });
}
