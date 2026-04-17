import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_UPGRADE_REQUIRED } from './errors.js';
import { setFormat } from './output.js';
import {
  type CachedManifest,
  type VersionManifest,
  compareSemver,
  enforceManifest,
  isCacheStale,
  readCachedManifest,
  writeCachedManifest,
} from './update.js';

beforeEach(() => {
  setFormat('json');
  process.env.PHILIPS_HUE_HOME = join(
    process.env.TMPDIR ?? '/tmp',
    `hue-update-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(process.env.PHILIPS_HUE_HOME, { recursive: true });
});

afterEach(() => {
  process.env.PHILIPS_HUE_HOME = undefined;
  vi.restoreAllMocks();
});

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });

  it('returns negative when a < b', () => {
    expect(compareSemver('0.1.0', '0.2.0')).toBeLessThan(0);
    expect(compareSemver('0.1.0', '1.0.0')).toBeLessThan(0);
    expect(compareSemver('1.2.3', '1.2.4')).toBeLessThan(0);
  });

  it('returns positive when a > b', () => {
    expect(compareSemver('1.0.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareSemver('0.2.0', '0.1.9')).toBeGreaterThan(0);
  });
});

describe('isCacheStale', () => {
  it('returns false for a fresh cache entry', () => {
    const cached: CachedManifest = {
      latest: '1.0.0',
      min_required: '0.1.0',
      fetched_at: Date.now(),
    };
    expect(isCacheStale(cached)).toBe(false);
  });

  it('returns true when cache is older than 1 hour', () => {
    const cached: CachedManifest = {
      latest: '1.0.0',
      min_required: '0.1.0',
      fetched_at: Date.now() - 61 * 60 * 1000,
    };
    expect(isCacheStale(cached)).toBe(true);
  });
});

describe('readCachedManifest / writeCachedManifest', () => {
  it('returns null when no file exists', () => {
    expect(readCachedManifest()).toBeNull();
  });

  it('round-trips a manifest through disk', () => {
    const manifest: CachedManifest = {
      latest: '2.0.0',
      min_required: '1.0.0',
      fetched_at: 1234567890,
    };
    writeCachedManifest(manifest);
    const loaded = readCachedManifest();
    expect(loaded?.latest).toBe('2.0.0');
    expect(loaded?.fetched_at).toBe(1234567890);
  });

  it('returns null on corrupt JSON', () => {
    const path = join(process.env.PHILIPS_HUE_HOME as string, 'version-manifest.json');
    writeFileSync(path, '{ bad json', 'utf8');
    expect(readCachedManifest()).toBeNull();
  });
});

describe('enforceManifest', () => {
  function captureExit() {
    const stderr: string[] = [];
    const stdout: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((c) => {
      stderr.push(String(c));
      return true;
    });
    vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
      stdout.push(String(c));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    return { stderr, stdout };
  }

  it('is a no-op when current version equals latest', () => {
    const manifest: VersionManifest = { latest: '0.1.0', min_required: '0.1.0' };
    expect(() => enforceManifest(manifest, '0.1.0')).not.toThrow();
  });

  it('prints a stderr notice when update is available (soft deprecation)', () => {
    const { stderr } = captureExit();
    const manifest: VersionManifest = { latest: '0.2.0', min_required: '0.1.0' };
    enforceManifest(manifest, '0.1.0');
    expect(stderr.join('')).toContain('Update available');
    expect(stderr.join('')).toContain('0.1.0');
    expect(stderr.join('')).toContain('0.2.0');
  });

  it('exits with EXIT_UPGRADE_REQUIRED when below min_required (hard deprecation)', () => {
    const { stdout } = captureExit();
    const manifest: VersionManifest = {
      latest: '1.0.0',
      min_required: '0.5.0',
      min_required_reason: 'Security patch',
    };
    expect(() => enforceManifest(manifest, '0.1.0')).toThrow('exit');
    const env = JSON.parse(stdout[0]);
    expect(env.ok).toBe(false);
    expect(env.error_code).toBe('UPGRADE_REQUIRED');
    expect(env.error).toContain('no longer supported');
    expect(env.error).toContain('Security patch');
  });

  it('uses EXIT_UPGRADE_REQUIRED exit code', () => {
    captureExit();
    const exitSpy = vi.spyOn(process, 'exit');
    const manifest: VersionManifest = { latest: '1.0.0', min_required: '0.5.0' };
    expect(() => enforceManifest(manifest, '0.1.0')).toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(EXIT_UPGRADE_REQUIRED);
  });
});
