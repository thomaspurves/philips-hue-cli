import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFormat } from '../lib/output.js';
import { CLI_VERSION, SCHEMA_VERSION } from '../lib/version.js';
import { versionAction } from './version.js';

function captureExit() {
  const stdout: string[] = [];
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
    stdout.push(String(c));
    return true;
  });
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('exit');
  });
  return {
    stdout,
    restore() {
      stdoutSpy.mockRestore();
      exitSpy.mockRestore();
    },
  };
}

beforeEach(() => setFormat('human'));

describe('versionAction', () => {
  it('returns JSON envelope with version data', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => versionAction()).toThrow('exit');
    const env = JSON.parse(cap.stdout.find((l) => l.trim().startsWith('{')) ?? '{}');
    expect(env.ok).toBe(true);
    expect(env.error).toBeNull();
    cap.restore();
  });

  it('data includes version, schema_version, min_supported', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => versionAction()).toThrow('exit');
    const data = JSON.parse(cap.stdout.find((l) => l.trim().startsWith('{')) ?? '{}')
      .data as Record<string, unknown>;
    expect(data.version).toBe(CLI_VERSION);
    expect(data.schema_version).toBe(SCHEMA_VERSION);
    expect(typeof data.min_supported).toBe('string');
    cap.restore();
  });

  it('envelope itself includes schema_version and cli_version', () => {
    setFormat('json');
    const cap = captureExit();
    expect(() => versionAction()).toThrow('exit');
    const env = JSON.parse(cap.stdout.find((l) => l.trim().startsWith('{')) ?? '{}');
    expect(env.schema_version).toBe(SCHEMA_VERSION);
    expect(env.cli_version).toBe(CLI_VERSION);
    cap.restore();
  });

  it('human mode prints version string', () => {
    setFormat('human');
    const cap = captureExit();
    expect(() => versionAction()).toThrow('exit');
    expect(cap.stdout.join('')).toContain(CLI_VERSION);
    expect(cap.stdout.join('')).toContain(SCHEMA_VERSION);
    cap.restore();
  });
});
