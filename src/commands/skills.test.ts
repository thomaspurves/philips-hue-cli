import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFormat } from '../lib/output.js';
import { detectHarness, installAction, skillsSourceDir } from './skills.js';

function captureExit() {
  const stdout: string[] = [];
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
    stdout.push(String(c));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
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

function jsonLine(lines: string[]): Record<string, unknown> {
  const line = lines.find((l) => l.trim().startsWith('{'));
  if (!line) throw new Error(`No JSON line found in: ${JSON.stringify(lines)}`);
  return JSON.parse(line) as Record<string, unknown>;
}

function tempHome(): string {
  const dir = join(
    tmpdir(),
    `hue-skills-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

beforeEach(() => setFormat('json'));

describe('skillsSourceDir', () => {
  it('returns a path ending in skills/philips-hue', () => {
    const dir = skillsSourceDir();
    expect(dir).toMatch(/skills[/\\]philips-hue$/);
  });

  it('points to a directory that exists', () => {
    expect(existsSync(skillsSourceDir())).toBe(true);
  });

  it('contains SKILL.md', () => {
    expect(existsSync(join(skillsSourceDir(), 'SKILL.md'))).toBe(true);
  });
});

describe('detectHarness', () => {
  it('detects claude-code when ~/.claude exists', () => {
    const home = tempHome();
    mkdirSync(join(home, '.claude'));
    const result = detectHarness(home);
    expect(result.harness).toBe('claude-code');
    expect(result.target).toContain('.claude');
    expect(result.target).toContain('philips-hue');
  });

  it('detects codex when ~/.codex exists', () => {
    const home = tempHome();
    mkdirSync(join(home, '.codex'));
    const result = detectHarness(home);
    expect(result.harness).toBe('codex');
    expect(result.target).toContain('.codex');
  });

  it('prefers claude-code over codex when both exist', () => {
    const home = tempHome();
    mkdirSync(join(home, '.claude'));
    mkdirSync(join(home, '.codex'));
    expect(detectHarness(home).harness).toBe('claude-code');
  });

  it('returns unknown when neither exists', () => {
    const home = tempHome();
    expect(detectHarness(home).harness).toBe('unknown');
  });
});

describe('installAction', () => {
  it('copies SKILL.md to explicit --path', () => {
    const home = tempHome();
    const target = join(home, 'custom-skills', 'philips-hue');
    const cap = captureExit();
    expect(() => installAction({ path: target }, home)).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    expect(env.data as Record<string, unknown>).toMatchObject({ installed: true, target });
    expect(existsSync(join(target, 'SKILL.md'))).toBe(true);
    cap.restore();
  });

  it('auto-installs to claude-code when ~/.claude exists', () => {
    const home = tempHome();
    mkdirSync(join(home, '.claude'));
    const cap = captureExit();
    expect(() => installAction({}, home)).toThrow('exit');
    const env = jsonLine(cap.stdout);
    const data = env.data as Record<string, unknown>;
    expect(data.harness).toBe('claude-code');
    expect(existsSync(join(data.target as string, 'SKILL.md'))).toBe(true);
    cap.restore();
  });

  it('auto-installs to codex when ~/.codex exists', () => {
    const home = tempHome();
    mkdirSync(join(home, '.codex'));
    const cap = captureExit();
    expect(() => installAction({}, home)).toThrow('exit');
    const data = jsonLine(cap.stdout).data as Record<string, unknown>;
    expect(data.harness).toBe('codex');
    expect(existsSync(join(data.target as string, 'SKILL.md'))).toBe(true);
    cap.restore();
  });

  it('succeeds with harness:unknown when no harness detected', () => {
    const home = tempHome();
    const cap = captureExit();
    expect(() => installAction({}, home)).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    cap.restore();
  });

  it('is idempotent — re-installing overwrites cleanly', () => {
    const home = tempHome();
    mkdirSync(join(home, '.claude'));
    const cap = captureExit();
    expect(() => installAction({}, home)).toThrow('exit');
    cap.stdout.length = 0;
    expect(() => installAction({}, home)).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    cap.restore();
  });
});
