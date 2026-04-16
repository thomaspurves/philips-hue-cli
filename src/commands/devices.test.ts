import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeCredentials } from '../lib/auth.js';
import { setFormat } from '../lib/output.js';
import { getAction, listAction, setAction } from './devices.js';

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

beforeEach(() => {
  setFormat('json');
  writeCredentials({ access_token: 'mock-token-test', authenticated: true, user: 'test@test.com' });
});

describe('devices list', () => {
  it('returns all 8 lights by default', () => {
    const cap = captureExit();
    expect(() => listAction({})).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    expect((env.data as unknown[]).length).toBe(8);
    cap.restore();
  });

  it('each light has room metadata', () => {
    const cap = captureExit();
    expect(() => listAction({})).toThrow('exit');
    const lights = jsonLine(cap.stdout).data as Array<Record<string, unknown>>;
    const first = lights[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('type');
    expect(first).toHaveProperty('room');
    expect((first.room as Record<string, unknown>).name).toBeDefined();
    expect(first).toHaveProperty('state');
    cap.restore();
  });

  it('filters by room (case-insensitive)', () => {
    const cap = captureExit();
    expect(() => listAction({ room: 'kitchen' })).toThrow('exit');
    const lights = jsonLine(cap.stdout).data as unknown[];
    expect(lights.length).toBe(3);
    cap.restore();
  });

  it('filters bedroom', () => {
    const cap = captureExit();
    expect(() => listAction({ room: 'BEDROOM' })).toThrow('exit');
    const lights = jsonLine(cap.stdout).data as unknown[];
    expect(lights.length).toBe(2);
    cap.restore();
  });

  it('returns error for unknown room', () => {
    const cap = captureExit();
    expect(() => listAction({ room: 'Attic' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(false);
    expect(env.error).toContain('Attic');
    cap.restore();
  });

  it('human mode renders table', () => {
    setFormat('human');
    const cap = captureExit();
    expect(() => listAction({})).toThrow('exit');
    const out = cap.stdout.join('');
    expect(out).toContain('ID');
    expect(out).toContain('Kitchen Counter');
    cap.restore();
  });
});

describe('devices get', () => {
  it('returns a single light with room', () => {
    const cap = captureExit();
    expect(() => getAction('light-004')).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    const data = env.data as Record<string, unknown>;
    expect(data.id).toBe('light-004');
    expect(data.name).toBe('Bedroom Lamp');
    expect((data.room as Record<string, unknown>).name).toBe('Bedroom');
    cap.restore();
  });

  it('returns exit 2 for unknown id', () => {
    const cap = captureExit();
    expect(() => getAction('light-999')).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(false);
    expect(env.error).toContain('light-999');
    cap.restore();
  });
});

describe('devices set — single light', () => {
  it('turns a light on', () => {
    const cap = captureExit();
    expect(() => setAction('light-004', { state: 'on' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(true);
    const data = env.data as Record<string, unknown>;
    const affected = data.affected as Array<Record<string, unknown>>;
    expect(affected[0].id).toBe('light-004');
    expect(affected[0].state).toBe('on');
    expect(affected[0].changed).toBe(true);
    cap.restore();
  });

  it('idempotent: already-on → on yields changed:false', () => {
    // light-001 defaults to on
    const cap = captureExit();
    expect(() => setAction('light-001', { state: 'on' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    const affected = (env.data as Record<string, unknown>).affected as Array<
      Record<string, unknown>
    >;
    expect(affected[0].changed).toBe(false);
    cap.restore();
  });

  it('returns exit 2 for unknown light id', () => {
    const cap = captureExit();
    expect(() => setAction('light-999', { state: 'on' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(false);
    cap.restore();
  });
});

describe('devices set — by room', () => {
  it('turns all kitchen lights off', () => {
    const cap = captureExit();
    expect(() => setAction(undefined, { room: 'Kitchen', state: 'off' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    const data = env.data as Record<string, unknown>;
    const affected = data.affected as Array<Record<string, unknown>>;
    expect(affected.length).toBe(3);
    expect(affected.every((a) => a.state === 'off')).toBe(true);
    expect((data.summary as Record<string, unknown>).count).toBe(3);
    cap.restore();
  });

  it('room match is case-insensitive', () => {
    const cap = captureExit();
    expect(() => setAction(undefined, { room: 'living room', state: 'on' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    const affected = (env.data as Record<string, unknown>).affected as unknown[];
    expect(affected.length).toBe(3);
    cap.restore();
  });

  it('returns error for unknown room', () => {
    const cap = captureExit();
    expect(() => setAction(undefined, { room: 'Garage', state: 'on' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(false);
    cap.restore();
  });
});

describe('devices set — all lights', () => {
  it('turns ALL 8 lights on when no id or room given', () => {
    const cap = captureExit();
    expect(() => setAction(undefined, { state: 'on' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    const affected = (env.data as Record<string, unknown>).affected as unknown[];
    expect(affected.length).toBe(8);
    cap.restore();
  });

  it('summary.changed reflects actual changes', () => {
    // All lights off first
    const cap = captureExit();
    expect(() => setAction(undefined, { state: 'off' })).toThrow('exit');
    cap.stdout.length = 0;
    // Now turn on — all 8 should change
    expect(() => setAction(undefined, { state: 'on' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    const summary = (env.data as Record<string, unknown>).summary as Record<string, number>;
    expect(summary.count).toBe(8);
    expect(summary.changed).toBe(8);
    cap.restore();
  });
});

describe('devices set — input validation', () => {
  it('rejects both id and --room', () => {
    const cap = captureExit();
    expect(() => setAction('light-001', { room: 'Kitchen', state: 'on' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(false);
    expect(env.error).toContain('Cannot specify both');
    cap.restore();
  });

  it('rejects invalid state value', () => {
    const cap = captureExit();
    expect(() => setAction('light-001', { state: 'dim' })).toThrow('exit');
    const env = jsonLine(cap.stdout);
    expect(env.ok).toBe(false);
    cap.restore();
  });
});
