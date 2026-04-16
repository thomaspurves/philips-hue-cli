import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { EXIT_AUTH } from './errors.js';
import { fail } from './output.js';
import { credentialsPath, hueHome } from './paths.js';

export interface Credentials {
  access_token: string;
  authenticated: boolean;
  user: string;
}

export function isAuthenticated(): boolean {
  try {
    const raw = readFileSync(credentialsPath(), 'utf8');
    const creds = JSON.parse(raw) as Credentials;
    return creds.authenticated === true;
  } catch {
    return false;
  }
}

export function loadCredentials(): Credentials | null {
  try {
    const raw = readFileSync(credentialsPath(), 'utf8');
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function writeCredentials(creds: Credentials): void {
  mkdirSync(hueHome(), { recursive: true });
  writeFileSync(credentialsPath(), JSON.stringify(creds, null, 2), 'utf8');
}

export function deleteCredentials(): void {
  try {
    rmSync(credentialsPath());
  } catch {
    // Already gone — no-op.
  }
}

export function requireAuth(): void {
  if (!isAuthenticated()) {
    fail('Not authenticated. Run: philips-hue auth login', EXIT_AUTH);
  }
}

export function generateToken(): string {
  const bytes = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  ).join('');
  return `mock-token-${bytes}`;
}
