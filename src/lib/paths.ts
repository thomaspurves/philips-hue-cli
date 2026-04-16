import { homedir } from 'node:os';
import { join } from 'node:path';

export function hueHome(): string {
  return process.env.PHILIPS_HUE_HOME ?? join(homedir(), '.philips-hue');
}

export function credentialsPath(): string {
  return join(hueHome(), 'credentials.json');
}

export function mockStatePath(): string {
  return join(hueHome(), 'mock-state.json');
}
