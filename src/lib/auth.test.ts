import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deleteCredentials,
  generateToken,
  isAuthenticated,
  loadCredentials,
  writeCredentials,
} from './auth.js';
import { credentialsPath, hueHome } from './paths.js';

const mockCreds = () => ({
  access_token: 'mock-token-abc123',
  authenticated: true,
  user: 'demo@philipshue.com',
});

describe('isAuthenticated', () => {
  it('returns false when credentials file missing', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when valid credentials exist', () => {
    writeCredentials(mockCreds());
    expect(isAuthenticated()).toBe(true);
  });

  it('returns false when credentials file is malformed', () => {
    mkdirSync(hueHome(), { recursive: true });
    writeFileSync(credentialsPath(), '{ bad json', 'utf8');
    expect(isAuthenticated()).toBe(false);
  });
});

describe('loadCredentials', () => {
  it('returns null when file is missing', () => {
    expect(loadCredentials()).toBeNull();
  });

  it('returns credentials when file exists', () => {
    writeCredentials(mockCreds());
    const creds = loadCredentials();
    expect(creds?.authenticated).toBe(true);
    expect(creds?.user).toBe('demo@philipshue.com');
  });
});

describe('deleteCredentials', () => {
  it('removes credentials file', () => {
    writeCredentials(mockCreds());
    expect(isAuthenticated()).toBe(true);
    deleteCredentials();
    expect(isAuthenticated()).toBe(false);
  });

  it('does not throw if file is already gone', () => {
    expect(() => deleteCredentials()).not.toThrow();
  });
});

describe('generateToken', () => {
  it('starts with mock-token-', () => {
    expect(generateToken()).toMatch(/^mock-token-[0-9a-f]{16}$/);
  });

  it('generates unique tokens', () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});
