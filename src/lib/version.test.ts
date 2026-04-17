import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CLI_VERSION, SCHEMA_VERSION } from './version.js';

const pkgVersion = (
  JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'), 'utf8'),
  ) as { version: string }
).version;

describe('CLI_VERSION', () => {
  it('matches package.json version', () => {
    expect(CLI_VERSION).toBe(pkgVersion);
  });

  it('follows semver format', () => {
    expect(CLI_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('SCHEMA_VERSION', () => {
  it('is a non-empty string', () => {
    expect(typeof SCHEMA_VERSION).toBe('string');
    expect(SCHEMA_VERSION.length).toBeGreaterThan(0);
  });

  it('is currently "1"', () => {
    expect(SCHEMA_VERSION).toBe('1');
  });
});
